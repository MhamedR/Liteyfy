import express from 'express';
import { SubscriptionController } from '../controllers/subscriptionController.js';

const router = express.Router();
const controller = new SubscriptionController();

/**
 * @route POST /api/subscriptions
 * @desc Create or update a subscription
 */
router.post('/', controller.createOrUpdateSubscription.bind(controller));

/**
 * @route GET /api/subscriptions/:endpoint
 * @desc Get subscription by endpoint
 */
router.get('/:endpoint(*)', controller.getSubscription.bind(controller));

/**
 * @route PATCH /api/subscriptions/:endpoint/train-lines
 * @desc Add or update train line subscription
 */
router.patch('/:endpoint(*)/train-lines', controller.updateTrainLines.bind(controller));

/**
 * @route DELETE /api/subscriptions/:endpoint/train-lines/:lineId
 * @desc Remove train line subscription
 */
router.delete('/:endpoint(*)/train-lines/:lineId', controller.removeTrainLine.bind(controller));

/**
 * @route PATCH /api/subscriptions/:endpoint/weather-regions
 * @desc Add or update weather region subscription
 */
router.patch('/:endpoint(*)/weather-regions', controller.updateWeatherRegions.bind(controller));

/**
 * @route DELETE /api/subscriptions/:endpoint/weather-regions/:regionId
 * @desc Remove weather region subscription
 */
router.delete('/:endpoint(*)/weather-regions/:regionId', controller.removeWeatherRegion.bind(controller));

/**
 * @route PATCH /api/subscriptions/:endpoint/stib-lines
 * @desc Add or update STIB line subscription
 */
router.patch('/:endpoint(*)/stib-lines', controller.updateStibLines.bind(controller));

/**
 * @route DELETE /api/subscriptions/:endpoint/stib-lines/:lineId
 * @desc Remove STIB line subscription
 */
router.delete('/:endpoint(*)/stib-lines/:lineId', controller.removeStibLine.bind(controller));

/**
 * @route PATCH /api/subscriptions/:endpoint/quiet-hours
 * @desc Update quiet hours settings
 */
router.patch('/:endpoint(*)/quiet-hours', controller.updateQuietHours.bind(controller));

/**
 * @route DELETE /api/subscriptions/:endpoint
 * @desc Delete subscription
 */
router.delete('/:endpoint(*)', controller.deleteSubscription.bind(controller));

export default router;

