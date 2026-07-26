import { z } from 'zod';
import { RoleEnum, UserSchema } from './user.schema';

export type Role = z.infer<typeof RoleEnum>;
export type User = z.infer<typeof UserSchema>;

export type CreateUserDTO = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
