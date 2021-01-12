export class PrimeMigration_0_1_10_to_0_1_17
{
	static async update()
	{
		ui.notifications.info("Migrating world from 0.1.10 to version 0.1.17.");
		var success = await this.updateItems()

		if (success)
		{
			const message = "Migration to version 0.1.17 successful, goats were herded."
			ui.notifications.info(message);
			console.log(message);
			game.settings.set("prime", "notAutoIncrementedBeforeICanCheckItWorldVersionNumber", game.system.data.version);
		}
		else
		{
			const error = "Migration to version 0.1.16 failed, goats were not herded. See console for more details.";
			ui.notifications.error(error);
			console.error(error);
		}
	}

	static async updateItems()
	{
		return true;
	}
}