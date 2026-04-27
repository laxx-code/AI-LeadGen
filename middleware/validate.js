
function validateLeadSearch(req, res, next) {
  const { productName, businessType, location } = req.body;

  if (!location || location.trim() === '') {
    return res.status(400).json({
      success: false,
      code: 'MISSING_LOCATION',
      error: 'Location is required'
    });
  }

  if (!productName && !businessType) {
    return res.status(400).json({
      success: false,
      code: 'MISSING_SEARCH_TERM',
      error: 'At least one of productName or businessType is required'
    });
  }
  req.body.location = location.trim();
  if (productName) req.body.productName = productName.trim();
  if (businessType) req.body.businessType = businessType.trim();

  next();
}

module.exports = { validateLeadSearch };