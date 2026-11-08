export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  firstName: string;
  surname: string;
  inviteCode: string;
}
