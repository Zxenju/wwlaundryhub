import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const apiDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = join(apiDirectory, '.data');
const bookingsFile = join(dataDirectory, 'bookings.json');
const pricingFile = join(dataDirectory, 'pricing.json');
const defaultPricingFile = join(apiDirectory, 'default-pricing.json');
const allowedStatuses = ['Received', 'Washing', 'Drying', 'Ready for Pickup', 'Completed'];
const allowedUnits = ['unconfirmed', 'per-kg', 'per-load', 'flat'];
let storePromise;

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isPhilippineContact(value) {
  if (typeof value !== 'string' || !/^[+0-9().\-\s]+$/.test(value.trim())) return false;
  const compact = value.replace(/[().\-\s]/g, '');
  const national = compact.startsWith('+63')
    ? `0${compact.slice(3)}`
    : compact.startsWith('63') ? `0${compact.slice(2)}` : compact;
  return /^0\d{7,10}$/.test(national);
}

function makeDemoBookings(pricing) {
  const services = pricing.services;
  const sampleRows = [
    ['Demo customer A', '0900 000 0001', services[0], 'promo', 4.2, false, 0, 1, 'Washing'],
    ['Demo customer B', '0900 000 0002', services[1], 'regular', 2.5, false, 0, 0, 'Ready for Pickup'],
    ['Demo customer C', '0900 000 0003', services[2], 'regular', 3, false, -1, 0, 'Completed'],
    ['Demo customer D', '0900 000 0004', services[0], 'regular', 5.8, false, 0, 2, 'Received'],
  ];

  return sampleRows.map(([customerName, contactNumber, service, rateType, weightKg, express, bookingOffset, pickupOffset, status]) => {
    const serviceRate = rateType === 'promo' && service.promoRate !== null ? service.promoRate : service.regularRate;
    const serviceLabel = rateType === 'promo' && service.promoRate !== null ? service.promoLabel : service.regularLabel;
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      customerName,
      contactNumber,
      serviceId: service.id,
      rateType,
      weightKg,
      express,
      bookingDate: localDate(bookingOffset),
      pickupDate: localDate(pickupOffset),
      notes: 'Fictional sample record for class demonstration.',
      status,
      charge: {
        serviceName: service.name,
        rateLabel: serviceLabel,
        rateAmount: serviceRate,
        billingUnit: service.billingUnit,
        quantity: null,
        serviceAmount: null,
        expressLabel: null,
        expressAmount: 0,
        totalAmount: null,
        explanation: 'Demo record. The shop sign does not confirm the billing unit.',
      },
      createdAt: now,
      updatedAt: now,
      completedAt: status === 'Completed' ? new Date(`${localDate(bookingOffset)}T12:00:00`).toISOString() : null,
      demoRecord: true,
    };
  });
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function loadStore() {
  if (!storePromise) {
    storePromise = (async () => {
      await mkdir(dataDirectory, { recursive: true });
      let pricing;
      try {
        pricing = await readJson(pricingFile);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        pricing = await readJson(defaultPricingFile);
        await writeJson(pricingFile, pricing);
      }

      let bookings;
      try {
        bookings = await readJson(bookingsFile);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        bookings = makeDemoBookings(pricing);
        await writeJson(bookingsFile, bookings);
      }

      return { bookings, pricing };
    })();
  }
  return storePromise;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw Object.assign(new Error('Request body is too large.'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function validateBooking(draft, pricing) {
  if (!draft || typeof draft !== 'object') return 'Booking data is required.';
  if (typeof draft.customerName !== 'string' || draft.customerName.trim().length < 2 || draft.customerName.length > 70) {
    return 'Customer name must be between 2 and 70 characters.';
  }
  if (!isPhilippineContact(draft.contactNumber)) return 'Enter a valid Philippine contact number.';
  const service = pricing.services.find((item) => item.id === draft.serviceId);
  if (!service) return 'Choose a configured service.';
  if (draft.rateType === 'promo' && service.promoRate === null) return 'This service has no configured promo rate.';
  if (!Number.isFinite(draft.weightKg) || draft.weightKg <= 0) return 'Weight must be greater than zero.';
  if (draft.weightKg < pricing.weightLimits.minimumKg || draft.weightKg > pricing.weightLimits.maximumKg) {
    return `Weight must be between ${pricing.weightLimits.minimumKg} and ${pricing.weightLimits.maximumKg} kg.`;
  }
  if (!['promo', 'regular'].includes(draft.rateType)) return 'Choose a valid rate type.';
  if (!allowedStatuses.includes(draft.status)) return 'Choose a valid booking status.';
  if (typeof draft.express !== 'boolean') return 'Choose a valid express option.';
  if (!isValidDate(draft.bookingDate) || draft.bookingDate < localDate()) {
    return 'Booking date cannot be in the past.';
  }
  if (!isValidDate(draft.pickupDate) || draft.pickupDate < draft.bookingDate) {
    return 'Pickup date must be on or after the booking date.';
  }
  if (typeof draft.notes !== 'string' || draft.notes.length > 500) return 'Notes must be 500 characters or fewer.';
  return null;
}

function calculateCharge(draft, pricing) {
  const service = pricing.services.find((item) => item.id === draft.serviceId);
  const usePromo = draft.rateType === 'promo' && service.promoRate !== null;
  const rateAmount = usePromo ? service.promoRate : service.regularRate;
  const rateLabel = usePromo ? service.promoLabel : service.regularLabel;
  const quantity = service.billingUnit === 'per-kg'
    ? draft.weightKg
    : service.billingUnit === 'unconfirmed' ? null : 1;
  const serviceAmount = quantity === null ? null : Math.round(rateAmount * quantity * 100) / 100;
  let expressAmount = 0;
  let expressLabel = null;

  if (draft.express && pricing.express.enabled) {
    expressLabel = pricing.express.label;
    const expressQuantity = pricing.express.unit === 'per-kg' ? draft.weightKg : 1;
    expressAmount = Math.round(pricing.express.amount * expressQuantity * 100) / 100;
  }

  return {
    serviceName: service.name,
    rateLabel,
    rateAmount,
    billingUnit: service.billingUnit,
    quantity,
    serviceAmount,
    expressLabel,
    expressAmount,
    totalAmount: serviceAmount === null ? null : Math.round((serviceAmount + expressAmount) * 100) / 100,
    explanation: service.billingUnit === 'unconfirmed'
      ? 'The shop sign does not confirm the billing unit. Confirm it with the shop to calculate an amount.'
      : `${rateAmount} × ${quantity} ${service.billingUnit === 'per-kg' ? 'kg' : service.billingUnit === 'per-load' ? 'load' : 'flat amount'}${expressAmount ? `, plus ${expressAmount} express` : ''}.`,
  };
}

function validatePricing(config) {
  if (!config || !Array.isArray(config.services) || config.services.length === 0) return 'At least one service is required.';
  const serviceIds = config.services.map((service) => service.id);
  if (new Set(serviceIds).size !== serviceIds.length || !config.services.every((service) =>
    typeof service.id === 'string'
    && typeof service.name === 'string' && service.name.trim()
    && typeof service.regularLabel === 'string' && service.regularLabel.trim()
    && Number.isFinite(service.regularRate) && service.regularRate >= 0
    && (service.promoRate === null || (Number.isFinite(service.promoRate) && service.promoRate >= 0))
    && (service.promoRate === null || (typeof service.promoLabel === 'string' && service.promoLabel.trim()))
    && allowedUnits.includes(service.billingUnit))) {
    return 'Each service needs a name, valid labels, non-negative rates and a valid billing unit.';
  }
  if (!config.express || typeof config.express.enabled !== 'boolean'
    || typeof config.express.label !== 'string' || !config.express.label.trim()
    || !Number.isFinite(config.express.amount) || config.express.amount < 0
    || !['flat', 'per-kg', 'per-load'].includes(config.express.unit)) {
    return 'Express option settings are invalid.';
  }
  if (!config.weightLimits || !Number.isFinite(config.weightLimits.minimumKg)
    || !Number.isFinite(config.weightLimits.maximumKg)
    || config.weightLimits.minimumKg <= 0
    || config.weightLimits.maximumKg < config.weightLimits.minimumKg) {
    return 'Weight limits must be positive, with maximum at least the minimum.';
  }
  return null;
}

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }

  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1:3000');
    const store = await loadStore();

    if (request.method === 'GET' && url.pathname === '/api/bookings') {
      sendJson(response, 200, {
        bookings: store.bookings,
        demoData: store.bookings.some((booking) => booking.demoRecord),
      });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/pricing') {
      sendJson(response, 200, store.pricing);
      return;
    }
    if (request.method === 'PUT' && url.pathname === '/api/pricing') {
      const config = await readRequestBody(request);
      const validationError = validatePricing(config);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }
      store.pricing = config;
      await writeJson(pricingFile, store.pricing);
      sendJson(response, 200, store.pricing);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/bookings') {
      const draft = await readRequestBody(request);
      const validationError = validateBooking(draft, store.pricing);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }
      if (draft.express && !store.pricing.express.enabled) {
        sendJson(response, 400, { error: 'Express service is not enabled in pricing setup.' });
        return;
      }
      const now = new Date().toISOString();
      const booking = {
        ...draft,
        customerName: draft.customerName.trim(),
        contactNumber: draft.contactNumber.trim(),
        id: randomUUID(),
        charge: calculateCharge(draft, store.pricing),
        createdAt: now,
        updatedAt: now,
        completedAt: draft.status === 'Completed' ? now : null,
        demoRecord: false,
      };
      store.bookings.unshift(booking);
      await writeJson(bookingsFile, store.bookings);
      sendJson(response, 201, booking);
      return;
    }

    const bookingMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)$/);
    if (bookingMatch) {
      const id = decodeURIComponent(bookingMatch[1]);
      const index = store.bookings.findIndex((booking) => booking.id === id);
      if (index < 0) {
        sendJson(response, 404, { error: 'Booking not found.' });
        return;
      }

      if (request.method === 'PUT') {
        const draft = await readRequestBody(request);
        const validationError = validateBooking(draft, store.pricing);
        if (validationError) {
          sendJson(response, 400, { error: validationError });
          return;
        }
        const existing = store.bookings[index];
        if (draft.express && !store.pricing.express.enabled && !existing.express) {
          sendJson(response, 400, { error: 'Express service is not enabled in pricing setup.' });
          return;
        }
        const pricingChanged = ['serviceId', 'rateType', 'weightKg', 'express']
          .some((key) => draft[key] !== existing[key]);
        const saved = {
          ...existing,
          ...draft,
          charge: pricingChanged ? calculateCharge(draft, store.pricing) : existing.charge,
          updatedAt: new Date().toISOString(),
          completedAt: draft.status === 'Completed'
            ? existing.status === 'Completed' ? existing.completedAt : new Date().toISOString()
            : null,
        };
        store.bookings[index] = saved;
        await writeJson(bookingsFile, store.bookings);
        sendJson(response, 200, saved);
        return;
      }

      if (request.method === 'DELETE') {
        store.bookings.splice(index, 1);
        await writeJson(bookingsFile, store.bookings);
        response.writeHead(204).end();
        return;
      }
    }

    sendJson(response, 404, { error: 'API route not found.' });
  } catch (error) {
    const statusCode = Number.isInteger(error.statusCode)
      ? error.statusCode
      : error instanceof SyntaxError ? 400 : 500;
    if (statusCode >= 500) console.error('Local API request failed:', error);
    sendJson(response, statusCode, {
      error: statusCode === 500 ? 'The local API could not complete this request.' : error.message || 'Request body is not valid JSON.',
    });
  }
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Laundry Hub local API listening at http://127.0.0.1:3000');
  console.log('Booking and pricing data are stored in api/.data/');
});
