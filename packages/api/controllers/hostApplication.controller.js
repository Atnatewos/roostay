// packages/api/controllers/hostApplication.controller.js
// Host application controller - handles HTTP requests for host upgrades
// Delegates business logic to hostApplicationService
const hostApplicationService = require('../../services/hostApplication.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const hostApplicationController = {
  /**
   * POST /api/users/apply-host
   * Submits a new host application for the authenticated guest user.
   * Body: { idType, idNumber, idFrontImageUrl, idBackImageUrl?, hostingExperience, propertyCount, motivation? }
   */
  apply: asyncHandler(async (req, res) => {
    const application = await hostApplicationService.apply(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Your application has been submitted successfully. We will review it within 24-48 hours.',
      data: { application },
    });
  }),

  /**
   * GET /api/users/host-application-status
   * Retrieves the latest application status for the authenticated user.
   */
  getStatus: asyncHandler(async (req, res) => {
    const application = await hostApplicationService.getApplicationStatus(req.user.id);
    
    res.status(200).json({
      success: true,
      data: { application },
    });
  }),
};

module.exports = hostApplicationController;