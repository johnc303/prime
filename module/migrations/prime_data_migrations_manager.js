import { PrimeMigration_0_1_7_to_0_1_10 } from "./PrimeMigration_0_1_7_to_0_1_10.js";
import { PrimeMigration_0_1_10_to_0_2_2 } from "./PrimeMigration_0_1_10_to_0_2_2.js";

export class PrimeDataMigrationManager
{
	static initialVersionOfImplmentation = "0.1.10";

	static async performIfMigrationRequired()
	{
		const migrationRequired = this.checkSystemVsWorldVersions();
		if (migrationRequired)
		{
			this.performMigration();
		}
	}

	static checkSystemVsWorldVersions()
	{
		if (!game.user.isGM)
		{
			return false;
		}

		const currentWorldVersion = game.settings.get("prime", "notAutoIncrementedBeforeICanCheckItWorldVersionNumber");
		const systemVersion = game.system.data.version;

		if (!currentWorldVersion)
		{
			if (systemVersion == this.initialVersionOfImplmentation)
			{
				ui.notifications.info("Initial implmentation, migration should be happening regardless.");
			}
			else
			{
				ui.notifications.info("Welcome to your new Prime world, we hope you have many happy adventures!");
				game.settings.set("prime", "notAutoIncrementedBeforeICanCheckItWorldVersionNumber", game.system.data.version);
				return false;
			}
		}

		const needsMigration = isNewerVersion(systemVersion, currentWorldVersion);
		if (needsMigration)
		{
			ui.notifications.info("World migration required, please be patient and do not close your game or shut down your server. World version: '" + currentWorldVersion + "', System version: '" + systemVersion + "'")
			return true;
		}
		return false;
	}

	static performMigration()
	{
		const currentWorldVersion = game.settings.get("prime", "notAutoIncrementedBeforeICanCheckItWorldVersionNumber");
		const systemVersion = game.system.data.version;

		switch (currentWorldVersion)
		{
			case "": // This should only happen if the world is pre-implmentation of this API
			case "0.1.7":
			case "0.1.8":
			case "0.1.9":
				PrimeMigration_0_1_7_to_0_1_10.update();
			break;
			case "0.1.10":
			case "0.1.11":
			case "0.1.12":
			case "0.1.13":
			case "0.1.14":
			case "0.1.15":
			case "0.1.16":
			case "0.1.17":			
			case "0.1.19":
			case "0.2.1":
				PrimeMigration_0_1_10_to_0_2_2.update();
			break;
			default:
				const errorMessage = "ERROR: Attempting to migrate from world version '" + currentWorldVersion + "' to system version '" + systemVersion + "' but unable to find matching migration.";
				ui.notifications.error(errorMessage);
				console.error(errorMessage)
			break;
		}
	}
}