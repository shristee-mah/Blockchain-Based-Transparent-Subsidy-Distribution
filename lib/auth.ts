// In-memory credentials for role-based authentication
export type Role = "admin" | "processing" | "transportation" | "distribution";

export interface UserCredentials {
  username: string;
  password: string;
  role: Role;
  displayName: string;
}

export const users: UserCredentials[] = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    displayName: "Admin",
  },
  {
    username: "processor1",
    password: "proc123",
    role: "processing",
    displayName: "Processing Node",
  },
  {
    username: "transporter1",
    password: "trans123",
    role: "transportation",
    displayName: "Transportation Node",
  },
  {
    username: "distributor1",
    password: "dist123",
    role: "distribution",
    displayName: "Distribution Node",
  },
];

export function authenticateUser(
  username: string,
  password: string
): UserCredentials | null {
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  return user || null;
}

export function getUserByUsername(username: string): UserCredentials | null {
  return users.find((u) => u.username === username) || null;
}

export function getRoleDisplayName(role: Role): string {
  const roleNames: Record<Role, string> = {
    admin: "Admin",
    processing: "Processing Node",
    transportation: "Transportation Node",
    distribution: "Distribution Node",
  };
  return roleNames[role];
}
