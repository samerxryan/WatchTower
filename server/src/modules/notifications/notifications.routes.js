import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Errors } from '../../utils/errors.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { serializeNotification } from '../../utils/serializers.js';
import { booleanQuerySchema, idSchema, paginationQuerySchema } from '../../utils/schemas.js';
import { validate } from '../../utils/validate.js';
import { authenticate } from '../../middleware/auth.js';
import * as notificationRepository from '../../repositories/notificationRepository.js';
import { generateDeadlineNotifications } from '../../services/notificationService.js';

export const notificationsRouter = express.Router();

notificationsRouter.use(authenticate);

const listQuerySchema = paginationQuerySchema.extend({
  unread: booleanQuerySchema.optional(),
});

const notificationParamsSchema = z.object({ notificationId: idSchema });

notificationsRouter.get(
  '/',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    await generateDeadlineNotifications(req.user);

    const query = req.valid.query;
    const pagination = parsePagination(query);
    const { rows, total } = await notificationRepository.listNotifications(req.user.id, {
      unreadOnly: query.unread === true,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return res.status(200).json({
      success: true,
      data: rows.map(serializeNotification),
      meta: paginationMeta(total, pagination.page, pagination.limit),
    });
  }),
);

notificationsRouter.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    await generateDeadlineNotifications(req.user);
    const count = await notificationRepository.countUnreadNotifications(req.user.id);
    return res.status(200).json({ success: true, data: { count } });
  }),
);

notificationsRouter.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    const updated = await notificationRepository.markAllNotificationsRead(req.user.id);
    return res.status(200).json({ success: true, data: { updated } });
  }),
);

notificationsRouter.patch(
  '/:notificationId/read',
  validate({ params: notificationParamsSchema }),
  asyncHandler(async (req, res) => {
    const notificationId = req.valid.params.notificationId;
    const found = await notificationRepository.markNotificationRead(notificationId, req.user.id);

    if (!found) {
      throw Errors.notFound('Notification introuvable.');
    }

    const { rows } = await notificationRepository.listNotifications(req.user.id, {
      unreadOnly: false,
      limit: 100,
      offset: 0,
    });
    const notification = rows.find((row) => Number(row.id) === notificationId);

    return res.status(200).json({
      success: true,
      data: notification ? serializeNotification(notification) : null,
    });
  }),
);
