import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import modelClasses from './models';

// Create the SQLite adapter
const adapter = new SQLiteAdapter({
  schema,
  // Enable database migration
  // migrations: migrations, // Add when you have migrations
  dbName: 'im_database',
  jsi: true, // Enable JSI for better performance
  onSetUpError: error => {
    console.error('Database setup error:', error);
  },
});

// Create the database
const database = new Database({
  adapter,
  modelClasses,
});

export { database };
export default database;

// Export models for convenience
export * from './models';
