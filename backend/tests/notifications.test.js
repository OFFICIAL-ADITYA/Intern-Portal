import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import Notification from '../src/models/Notification.model.js';
import { notify } from '../src/services/notification.service.js';
import User from '../src/models/User.js';
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../src/controllers/notification.controller.js';

test('Task E: Notifications Suite', async (t) => {
  await t.test('1. Notification model schema validations and indexes', () => {
    const indexes = Notification.schema.indexes();
    const compoundIndexExists = indexes.some(([fields]) => (
      fields.userId === 1 && fields.isRead === 1 && fields.createdAt === -1
    ));
    assert.equal(compoundIndexExists, true, 'Compound index { userId: 1, isRead: 1, createdAt: -1 } must exist');

    const paths = Notification.schema.paths;
    assert.ok(paths.userId, 'userId path must exist');
    assert.ok(paths.type, 'type path must exist');
    assert.ok(paths.title, 'title path must exist');
    assert.ok(paths.message, 'message path must exist');
    assert.ok(paths.requestId, 'requestId path must exist');
    assert.ok(paths.isRead, 'isRead path must exist');
    assert.ok(paths.readAt, 'readAt path must exist');
    assert.ok(paths.createdAt, 'createdAt timestamp must exist');
  });

  await t.test('2. notify() saves in-app notification and handles email flag', async () => {
    const origCreate = Notification.create;
    const origFindById = User.findById;

    let createdDoc = null;
    let emailLookupUserId = null;

    Notification.create = async (doc) => {
      createdDoc = { ...doc, _id: new mongoose.Types.ObjectId() };
      return createdDoc;
    };

    User.findById = (id) => ({
      select: async () => {
        emailLookupUserId = id.toString();
        return { _id: id, email: 'test@uptoskills.com', fullName: 'Test User' };
      }
    });

    try {
      const targetUserId = new mongoose.Types.ObjectId();
      const res = await notify(targetUserId, 'REQUEST_SUBMITTED', {
        title: 'New Request',
        message: 'A certificate request was submitted',
        requestId: new mongoose.Types.ObjectId(),
        email: false
      });

      assert.ok(res, 'notify should return created document');
      assert.equal(createdDoc.type, 'REQUEST_SUBMITTED');
      assert.equal(createdDoc.title, 'New Request');
      assert.equal(createdDoc.isRead, false);
      assert.equal(emailLookupUserId, null, 'Email lookup should not be called when email is false');
    } finally {
      Notification.create = origCreate;
      User.findById = origFindById;
    }
  });

  await t.test('3. notify() never throws if Brevo email or database fails', async () => {
    const origCreate = Notification.create;
    Notification.create = async () => {
      throw new Error('Simulated database failure');
    };

    try {
      await assert.doesNotReject(async () => {
        const res = await notify(new mongoose.Types.ObjectId(), 'REQUEST_APPROVED', {
          title: 'Request Approved',
          message: 'Certificate is on the way',
          email: true
        });
        assert.equal(res, null);
      });
    } finally {
      Notification.create = origCreate;
    }
  });

  await t.test('4. Endpoints: getUnreadCount returns correct count scoped to user', async () => {
    const origCount = Notification.countDocuments;
    let queryUsed = null;

    Notification.countDocuments = async (query) => {
      queryUsed = query;
      return 4;
    };

    const req = { user: { id: 'user_123' } };
    let jsonResult = null;
    let statusCode = null;

    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };

    try {
      await getUnreadCount(req, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonResult.unreadCount, 4);
      assert.equal(queryUsed.userId, 'user_123');
      assert.equal(queryUsed.isRead, false);
    } finally {
      Notification.countDocuments = origCount;
    }
  });

  await t.test('5. Endpoints: markNotificationAsRead returns 404 if notification belongs to someone else', async () => {
    const origFindOne = Notification.findOne;
    let queryUsed = null;

    Notification.findOne = async (query) => {
      queryUsed = query;
      return null; // Not found for this userId
    };

    const targetId = new mongoose.Types.ObjectId().toString();
    const req = {
      user: { id: 'user_A' },
      params: { id: targetId }
    };
    let jsonResult = null;
    let statusCode = null;

    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };

    try {
      await markNotificationAsRead(req, res);
      assert.equal(statusCode, 404);
      assert.equal(jsonResult.message, 'Notification not found');
      assert.equal(queryUsed.userId, 'user_A');
      assert.equal(queryUsed._id, targetId);
    } finally {
      Notification.findOne = origFindOne;
    }
  });

  await t.test('6. Endpoints: markAllNotificationsAsRead marks all read for req.user.id', async () => {
    const origUpdateMany = Notification.updateMany;
    let updateFilter = null;
    let updateDoc = null;

    Notification.updateMany = async (filter, update) => {
      updateFilter = filter;
      updateDoc = update;
      return { modifiedCount: 3 };
    };

    const req = { user: { id: 'user_B' } };
    let jsonResult = null;
    let statusCode = null;

    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };

    try {
      await markAllNotificationsAsRead(req, res);
      assert.equal(statusCode, 200);
      assert.equal(updateFilter.userId, 'user_B');
      assert.equal(updateFilter.isRead, false);
      assert.equal(updateDoc.$set.isRead, true);
      assert.ok(updateDoc.$set.readAt instanceof Date);
    } finally {
      Notification.updateMany = origUpdateMany;
    }
  });
});
