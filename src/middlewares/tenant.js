const prisma = require('../prisma');

async function tenantMiddleware(req, res, next) {
  const headerHotelId = req.headers['x-hotel-id'];
  const resolvedHotelId = headerHotelId || req.hotelId || (req.user && req.user.hotelId);

  if (!resolvedHotelId) {
    return res.status(400).json({ error: 'Hotel context required' });
  }

  if (req.user && req.user.hotelId !== resolvedHotelId) {
    return res.status(403).json({ error: 'Cross-tenant access denied' });
  }

  const hotel = await prisma.hotel.findUnique({ where: { id: resolvedHotelId } });
  if (!hotel) {
    return res.status(404).json({ error: 'Hotel not found' });
  }

  req.hotelId = resolvedHotelId;
  req.hotel = hotel;
  return next();
}

module.exports = { tenantMiddleware };
