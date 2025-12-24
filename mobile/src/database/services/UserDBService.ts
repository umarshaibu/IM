import { Q } from '@nozbe/watermelondb';
import database from '../index';
import { User } from '../models';

interface ServerUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
  email: string | null;
  status: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

class UserDBService {
  private usersCollection = database.get<User>('users');

  /**
   * Get all users from local database
   */
  async getAllUsers(): Promise<User[]> {
    try {
      return await this.usersCollection.query().fetch();
    } catch (error) {
      console.error('Error fetching users from DB:', error);
      return [];
    }
  }

  /**
   * Get a user by server ID
   */
  async getUserByServerId(serverId: string): Promise<User | null> {
    try {
      const users = await this.usersCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      return users[0] || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Sync a single user from server
   */
  async syncUser(serverUser: ServerUser): Promise<User> {
    let user: User | null = null;

    try {
      await database.write(async () => {
        const existing = await this.usersCollection
          .query(Q.where('server_id', serverUser.id))
          .fetch();

        if (existing.length > 0) {
          // Update existing user
          user = existing[0];
          await user.update(u => {
            u.username = serverUser.username;
            u.displayName = serverUser.displayName;
            u.avatarUrl = serverUser.avatarUrl;
            u.phoneNumber = serverUser.phoneNumber;
            u.email = serverUser.email;
            u.status = serverUser.status;
            u.lastSeenAt = serverUser.lastSeenAt
              ? new Date(serverUser.lastSeenAt).getTime()
              : null;
          });
        } else {
          // Create new user
          user = await this.usersCollection.create(u => {
            u.serverId = serverUser.id;
            u.username = serverUser.username;
            u.displayName = serverUser.displayName;
            u.avatarUrl = serverUser.avatarUrl;
            u.phoneNumber = serverUser.phoneNumber;
            u.email = serverUser.email;
            u.status = serverUser.status;
            u.lastSeenAt = serverUser.lastSeenAt
              ? new Date(serverUser.lastSeenAt).getTime()
              : null;
          });
        }
      });

      return user!;
    } catch (error) {
      console.error('Error syncing user:', error);
      throw error;
    }
  }

  /**
   * Sync multiple users from server
   */
  async syncUsers(serverUsers: ServerUser[]): Promise<void> {
    try {
      await database.write(async () => {
        for (const serverUser of serverUsers) {
          const existing = await this.usersCollection
            .query(Q.where('server_id', serverUser.id))
            .fetch();

          if (existing.length > 0) {
            await existing[0].update(u => {
              u.username = serverUser.username;
              u.displayName = serverUser.displayName;
              u.avatarUrl = serverUser.avatarUrl;
              u.phoneNumber = serverUser.phoneNumber;
              u.email = serverUser.email;
              u.status = serverUser.status;
              u.lastSeenAt = serverUser.lastSeenAt
                ? new Date(serverUser.lastSeenAt).getTime()
                : null;
            });
          } else {
            await this.usersCollection.create(u => {
              u.serverId = serverUser.id;
              u.username = serverUser.username;
              u.displayName = serverUser.displayName;
              u.avatarUrl = serverUser.avatarUrl;
              u.phoneNumber = serverUser.phoneNumber;
              u.email = serverUser.email;
              u.status = serverUser.status;
              u.lastSeenAt = serverUser.lastSeenAt
                ? new Date(serverUser.lastSeenAt).getTime()
                : null;
            });
          }
        }
      });
    } catch (error) {
      console.error('Error syncing users:', error);
      throw error;
    }
  }

  /**
   * Update user presence status
   */
  async updatePresence(serverId: string, status: string, lastSeenAt?: Date): Promise<void> {
    try {
      await database.write(async () => {
        const users = await this.usersCollection
          .query(Q.where('server_id', serverId))
          .fetch();

        if (users.length > 0) {
          await users[0].update(u => {
            u.status = status;
            if (lastSeenAt) {
              u.lastSeenAt = lastSeenAt.getTime();
            }
          });
        }
      });
    } catch (error) {
      console.error('Error updating user presence:', error);
    }
  }

  /**
   * Clear all users (for logout)
   */
  async clearAll(): Promise<void> {
    try {
      await database.write(async () => {
        const users = await this.usersCollection.query().fetch();

        for (const user of users) {
          await user.destroyPermanently();
        }
      });
    } catch (error) {
      console.error('Error clearing users:', error);
    }
  }
}

export const userDBService = new UserDBService();
export default userDBService;
