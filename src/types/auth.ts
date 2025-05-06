
export interface SignupFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  session: any | null;
  loading: boolean;
  initialized: boolean;
}

export interface ValidationErrors {
  [key: string]: string | null;
}

export interface RegistrationData {
  email: string;
  password: string;
  userData: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  registrationTime: string;
  userCreated?: boolean;
  planId?: string;
  contractSigned?: boolean;
}
