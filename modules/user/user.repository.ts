import { db } from '@/lib/db';
import { usersTable } from './user.schema';
import { eq, desc } from 'drizzle-orm';
import { CreateUserDTO, User } from './user.types';

export const userRepository = {
  async getAllUsers(): Promise<User[]> {
    return await db.query.usersTable.findMany({
      orderBy: [desc(usersTable.createdAt)],
    });
  },

  async createUser(data: CreateUserDTO): Promise<User> {
    const [user] = await db.insert(usersTable).values(data).returning();
    return user;
  },

  async findByEmail(email: string): Promise<User | undefined> {
    return await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });
  },
};
