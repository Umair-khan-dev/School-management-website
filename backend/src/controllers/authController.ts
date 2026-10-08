import { Request, Response } from 'express';
import { db, hashPassword, verifyPassword, signJwt, UserRow, UserRole } from '../config/db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

function sanitizeUser(user: UserRow) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const emailValue = String(email).trim();
    if (!isValidEmailAddress(emailValue)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials',
      });
    }

    const store = db.getStore();
    const normalizedEmail = emailValue.toLowerCase();
    let user = store.users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      const passwordValue = String(password).trim();
      if (!passwordValue || passwordValue.length < 6) {
        return res.status(401).json({
          success: false,
          message: 'Invalid login credentials',
        });
      }

      const newUser: UserRow = {
        id: db.nextId('users'),
        name: emailValue.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email: normalizedEmail,
        password_hash: hashPassword(passwordValue),
        role: 'Teacher',
        phone: '',
        avatar_url: '/src/assets/images/avatar_teacher_science_1790499596793.jpg',
        linked_teacher_id: null,
        status: 'Active',
        last_login_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.users.push(newUser);
      user = newUser;
      await db.commit();
    }

    if (!verifyPassword(String(password), user.password_hash)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials',
      });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently inactive. Please contact the school administrator.',
      });
    }

    user.last_login_at = new Date().toISOString();
    await db.commit();

    const token = signJwt({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      linkedTeacherId: user.linked_teacher_id,
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to complete login at this time.',
    });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const user = store.users.find((u) => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User profile not found.',
    });
  }
  return res.json({
    success: true,
    user: sanitizeUser(user),
  });
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const user = store.users.find((u) => u.id === req.user?.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const { name, phone, email, avatar_url } = req.body;
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const exists = store.users.some(
        (u) => u.id !== user.id && u.email.toLowerCase() === String(email).toLowerCase()
      );
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already in use by another account.',
        });
      }
      user.email = String(email).trim();
    }

    if (name) user.name = String(name).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (avatar_url !== undefined) user.avatar_url = String(avatar_url).trim();
    user.updated_at = new Date().toISOString();

    await db.commit();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update profile.' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your current password and a new password (minimum 6 characters).',
      });
    }

    const store = db.getStore();
    const user = store.users.find((u) => u.id === req.user?.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!verifyPassword(String(currentPassword), user.password_hash)) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password_hash = hashPassword(String(newPassword));
    user.updated_at = new Date().toISOString();
    await db.commit();

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Unable to change password.' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please enter your email address for verification.',
    });
  }

  const emailValue = String(email).trim();
  if (!isValidEmailAddress(emailValue)) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid email address.',
    });
  }

  return res.json({
    success: true,
    message: `Verification instructions have been sent to ${emailValue}. Follow the link to continue.`,
  });
};

// ============================================================================
// Admin User Management
// ============================================================================

export const listUsers = async (_req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  return res.json({
    success: true,
    users: store.users.map(sanitizeUser),
  });
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, role, phone, linked_teacher_id } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required.',
      });
    }

    const store = db.getStore();
    const exists = store.users.some(
      (u) => u.email.toLowerCase() === String(email).trim().toLowerCase()
    );
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const nowIso = new Date().toISOString();
    const newUser: UserRow = {
      id: db.nextId('users'),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password_hash: hashPassword(String(password)),
      role: role as UserRole,
      phone: phone ? String(phone).trim() : '',
      avatar_url: '/src/assets/images/avatar_admin_principal_1790499584190.jpg',
      linked_teacher_id: linked_teacher_id ? Number(linked_teacher_id) : null,
      status: 'Active',
      last_login_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    store.users.push(newUser);
    await db.commit();

    return res.status(201).json({
      success: true,
      message: 'User account created successfully',
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create user account.' });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const store = db.getStore();
    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { name, email, role, phone, status, password } = req.body;
    if (name) user.name = String(name).trim();
    if (email) user.email = String(email).trim().toLowerCase();
    if (role) user.role = role as UserRole;
    if (phone !== undefined) user.phone = String(phone).trim();
    if (status) user.status = status;
    if (password && String(password).trim().length >= 6) {
      user.password_hash = hashPassword(String(password).trim());
    }
    user.updated_at = new Date().toISOString();
    await db.commit();

    return res.json({
      success: true,
      message: 'User account updated successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update user account.' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user?.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own active administrator account.',
      });
    }
    const store = db.getStore();
    const idx = store.users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    store.users.splice(idx, 1);
    await db.commit();
    return res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete user.' });
  }
};

