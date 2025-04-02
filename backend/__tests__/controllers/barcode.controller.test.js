const mongoose = require('mongoose');
const { getProductByBarcode } = require('../../src/controllers/barcode.controller');
const barcodeService = require('../../src/services/barcode.service');
require('dotenv').config();

// Mock the barcode service
jest.mock('../../src/services/barcode.service');

describe('Barcode Controller', () => {
  let req, res;
  const validBarcode = '3017620422003'; // Nutella barcode
  const invalidBarcode = '3017620422004';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = {
      params: {
        code: validBarcode
      },
      user: {
        _id: 'test-user-id'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('should return product data when barcode is found', async () => {
    // Setup service mock to return valid product
    barcodeService.getProductByBarcode.mockResolvedValue({
      success: true,
      source: 'redis-cache',
      product_name: 'Nutella',
      message: 'Product found in Redis cache'
    });
    
    // Call the controller function
    await getProductByBarcode(req, res);
    
    // Verify the service was called with the correct parameter
    expect(barcodeService.getProductByBarcode).toHaveBeenCalledWith(validBarcode);
    
    // Verify the response was correctly formatted
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      source: 'redis-cache',
      product_name: 'Nutella',
      message: 'Product found in Redis cache'
    });
    
    // Status should not be called since we're returning a 200 (default)
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 404 when barcode is not found', async () => {
    // Update request to use invalid barcode
    req.params.code = invalidBarcode;
    
    // Setup service mock to throw "not found" error
    barcodeService.getProductByBarcode.mockRejectedValue(
      new Error('Product not found in external API')
    );
    
    // Call the controller function
    await getProductByBarcode(req, res);
    
    // Verify the service was called with the correct parameter
    expect(barcodeService.getProductByBarcode).toHaveBeenCalledWith(invalidBarcode);
    
    // Verify the response was correctly formatted with 404 status
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Product not found in external API'
    });
  });

  it('should return 500 on internal server error', async () => {
    // Setup service mock to throw a generic error
    barcodeService.getProductByBarcode.mockRejectedValue(
      new Error('Internal server error')
    );
    
    // Call the controller function
    await getProductByBarcode(req, res);
    
    // Verify the response was correctly formatted with 500 status
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error'
    });
  });
});
