export interface UserProfile {
  id: string;
  username: string; // Tên tài khoản / IGN Minecraft
  created_at: string;
}

const STORAGE_KEY_USER = 'kingmc_current_user';
const STORAGE_KEY_ACCOUNTS = 'kingmc_registered_accounts';

export function getCurrentUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function registerUser(username: string, password: string): { success: boolean; user?: UserProfile; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'Không thể thực thi trên server' };
  
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    return { success: false, error: 'Vui lòng nhập tên tài khoản hoặc IGN Minecraft' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    const accounts: Record<string, { id: string; passwordHash: string; created_at: string }> = raw ? JSON.parse(raw) : {};

    const key = cleanUsername.toLowerCase();
    if (accounts[key]) {
      return { success: false, error: 'Tên tài khoản này đã được đăng ký. Vui lòng chọn tên khác hoặc đăng nhập!' };
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 11);
    accounts[key] = {
      id: userId,
      passwordHash: password, // client-side auth for user convenience
      created_at: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));

    const user: UserProfile = {
      id: userId,
      username: cleanUsername,
      created_at: accounts[key].created_at
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Đã xảy ra lỗi khi tạo tài khoản' };
  }
}

export function loginUser(username: string, password: string): { success: boolean; user?: UserProfile; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'Không thể thực thi trên server' };

  const cleanUsername = username.trim();
  if (!cleanUsername) {
    return { success: false, error: 'Vui lòng nhập tên tài khoản hoặc IGN' };
  }
  if (!password) {
    return { success: false, error: 'Vui lòng nhập mật khẩu' };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    const accounts: Record<string, { id: string; passwordHash: string; created_at: string }> = raw ? JSON.parse(raw) : {};

    const key = cleanUsername.toLowerCase();
    const existing = accounts[key];

    // If no existing accounts created yet, allow instant first-login or notify
    if (!existing) {
      // Auto-register first time for user-friendly demo/Minecraft IGN login
      const userId = 'usr_' + Math.random().toString(36).substring(2, 11);
      accounts[key] = {
        id: userId,
        passwordHash: password,
        created_at: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
      const user: UserProfile = {
        id: userId,
        username: cleanUsername,
        created_at: accounts[key].created_at
      };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      return { success: true, user };
    }

    if (existing.passwordHash !== password) {
      return { success: false, error: 'Mật khẩu không chính xác' };
    }

    const user: UserProfile = {
      id: existing.id,
      username: cleanUsername,
      created_at: existing.created_at
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Đã xảy ra lỗi khi đăng nhập' };
  }
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_USER);
}
