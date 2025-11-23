import "@azure/core-asynciterator-polyfill";

import { SupabaseStorageAdapter } from "@/lib/storage/SupabaseStorageAdapter";
import { PowerSyncSQLiteDatabase, wrapPowerSyncWithDrizzle } from "@powersync/drizzle-driver";
import {
  createBaseLogger,
  LogLevel,
  PowerSyncDatabase,
  SyncClientImplementation,
} from "@powersync/react-native";
import React from "react";

import { AppSchema, drizzleAppSchema } from "@/lib/powersync/AppSchema";
import { KVStorage } from "@/lib/storage/kvStorage";
import { SupabaseConnector } from "@/lib/supabase/SupabaseConnector";

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

export class System {
  kvStorage: KVStorage;
  storage: SupabaseStorageAdapter;
  supabaseConnector: SupabaseConnector;
  powersync: PowerSyncDatabase;
  drizzle: PowerSyncSQLiteDatabase<typeof drizzleAppSchema>;
  private connectPromise: Promise<void> | null = null;

  constructor() {
    this.kvStorage = new KVStorage();
    this.supabaseConnector = new SupabaseConnector(this);
    this.storage = this.supabaseConnector.storage;
    this.powersync = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: "sqlite.db",
      },
      logger,
    });
    this.drizzle = wrapPowerSyncWithDrizzle<typeof drizzleAppSchema>(this.powersync, {
      schema: drizzleAppSchema,
    });
    /**
     * The snippet below uses OP-SQLite as the default database adapter.
     * You will have to uninstall `@journeyapps/react-native-quick-sqlite` and
     * install both `@powersync/op-sqlite` and `@op-engineering/op-sqlite` to use this.
     *
     * ```typescript
     * import { OPSqliteOpenFactory } from '@powersync/op-sqlite'; // Add this import
     *
     * const factory = new OPSqliteOpenFactory({
     *  dbFilename: 'sqlite.db'
     * });
     * this.powersync = new PowerSyncDatabase({ database: factory, schema: AppSchema });
     * ```
     */
  }

  async init() {
    await this.powersync.init();
    await this.connectIfSignedIn();
    this.supabaseConnector.client.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          await this.connectIfSignedIn();
        }
      }
    );
  }

  async connectIfSignedIn() {
    const {
      data: { session },
    } = await this.supabaseConnector.client.auth.getSession();

    if (!session) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.powersync
      .connect(this.supabaseConnector, {
        clientImplementation: SyncClientImplementation.RUST,
      })
      .finally(() => {
        this.connectPromise = null;
      });

    return this.connectPromise;
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
