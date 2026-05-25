import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  phone: string;
  role: 'owner' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loginWithOTP: (phone: string, otp: string) => Promise<boolean>;
  signupWithOTP: (name: string, phone: string, otp: string, pgName: string, city: string) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signupWithEmail: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginWithOTP = async (phone: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call for OTP verification
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Demo: accept any 6-digit OTP
    if (phone && otp.length === 6) {
      const demoUser: User = {
        id: '1',
        name: 'Admin User',
        phone: phone,
        role: 'owner',
      };
      setUser(demoUser);
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const signupWithOTP = async (name: string, phone: string, otp: string, pgName: string, city: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call for OTP verification and account creation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Demo: accept any 6-digit OTP
    if (name && phone && otp.length === 6 && pgName && city) {
      const newUser: User = {
        id: Date.now().toString(),
        name: name,
        phone: phone,
        role: 'owner',
      };
      setUser(newUser);
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Demo: accept any email/password
    if (email && password) {
      const demoUser: User = {
        id: '1',
        name: 'Khush Goyal',
        phone: '+91 9876543210',
        role: 'owner',
      };
      setUser(demoUser);
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const signupWithEmail = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Demo: accept any name/email/password
    if (name && email && password) {
      const newUser: User = {
        id: Date.now().toString(),
        name: name,
        phone: '+91 0000000000',
        role: 'owner',
      };
      setUser(newUser);
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginWithOTP, signupWithOTP, loginWithEmail, signupWithEmail, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}