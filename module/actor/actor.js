import { PrimeTables } from "../prime_tables.js";

/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class PrimePCActor extends Actor
{

	/**
	 * Augment the basic actor data with additional dynamic data.
	 */
	prepareData()
	{
		super.prepareData();

		const actorData = this.data;
		const data = actorData.data;
		const flags = actorData.flags;
		
		if (actorData.type === 'character')
		{
			this._prepareCharacterData(actorData);
		}
	}

	isNPC() {
		try {
			return this.data.data.metadata.isNPC;
		} catch (error) {
			return true;
		}
	}

	/**
	 * Prepare Character type specific data
	 */
	_prepareCharacterData(actorData)
	{
		const data = actorData.data;

		// Make modifications to data here. For example:

		const primeCost = this.getTotalCost(data.primes);
		const perkSoulCost = this.getTotalPerkCost("perkCostSoul");
		data.soul.spent = primeCost + perkSoulCost;


		const refinementCost = this.getTotalCost(data.refinements);
		const perkXPCost = this.getTotalPerkCost("perkCostXP");
		data.xp.spent = refinementCost + perkXPCost;

		this.updateOwnedItemValues();

		// Loop through ability scores, and add their modifiers to our sheet output.

		data.soul.value = (data.soul.initial + data.soul.awarded) - data.soul.spent;
		data.xp.value = (data.xp.initial + data.xp.awarded) - data.xp.spent;
	}

	getCurrentOwners(whatPermissions)
	{
		var whatPermissions = this.data.permission;
		let ownerNames = [];
		let currUser;
		for (var key in whatPermissions)
		{
			currUser = game.users.get(key)
			if (key != "default" && whatPermissions[key] == 3 && !currUser.isGM)
			{
				ownerNames.push(currUser.name);
			}
		}

		if (ownerNames.length == 0)
		{
			ownerNames.push("Not assigned");
		}

		return ownerNames.join(", ");
	}

	getCombinedResilience()
	{
		return this.data.data.health.resilience.value + this.data.data.armour.resilience.value;
	}

	getCombinedPsyche()
	{
		return this.data.data.mind.psyche.value + this.data.data.ward.psyche.value;
	}

	getTypeSortedPrimesAndRefinements()
	{
		var sortedData = {};
		var currEntry = null;
		for (var key in this.data.data.primes)
		{
			currEntry = this.data.data.primes[key];
			if (!sortedData[currEntry.type])
			{
				let localisedTitle = game.i18n.localize("PRIME.refinment_type_" + currEntry.type);
				sortedData[currEntry.type] =
				{
					primes: {},
					refinements: {},
					title: localisedTitle
				}
			}
			sortedData[currEntry.type].primes[key] = currEntry;
		}
		for (var key in this.data.data.refinements)
		{
			currEntry = this.data.data.refinements[key];
			sortedData[currEntry.type].refinements[key] = currEntry;
		}

		let sortedDataClone = $.extend(true, {}, sortedData);

		PrimeTables.addTranslations(sortedDataClone);

		return sortedDataClone;
	}

	getProcessedItems()
	{
		var filteredItems = this.filterAndCloneItemsByType();
		return filteredItems;
	}

	filterAndCloneItemsByType()
	{
		var itemClonesByTypes = {}

		this.items.forEach(function(currItem, key, map)
		{
			if (!itemClonesByTypes[currItem.type])
			{
				itemClonesByTypes[currItem.type] = [];
			}

			let processedCloneItem = currItem.getProcessedClone(currItem);

			itemClonesByTypes[currItem.type].push(processedCloneItem);
		});
		
		return itemClonesByTypes;
	}

	getSortedActions()
	{
		var typeSortedActions = {};

		ItemDirectory.collection.forEach((item, key, items) =>
		{
			if (item.type == "action")
			{
				let actionType = item.data.data.type
				if (!typeSortedActions[actionType])
				{
					typeSortedActions[actionType] = [];
				}

				var isAllowedForCharacter = this.isAllowedForCharacter(item)
				if (isAllowedForCharacter)
				{
					typeSortedActions[actionType].push(item);
				}
			}
		});

		return typeSortedActions;
	}

	isAllowedForCharacter(whatAction)
	{
		if (whatAction.data.data.default)
		{
			return true;
		}

		var ownedPerkClones = this.getProcessedItems()["perk"];
		
		if (ownedPerkClones)
		{
			var count = 0;
			while (count < ownedPerkClones.length)
			{
				var currPerk = ownedPerkClones[count];
				var unlocksAction = this.checkPerkActionUnlock(currPerk, whatAction);
				if (unlocksAction)
				{
					return unlocksAction;
				}
				count++;
			}
		}

		return false;		
	}

	checkPerkActionUnlock(whatPerk, whatAction)
	{
		var count = 0
		while (count < whatPerk.effects.length)
		{
			let currPerkEffect = whatPerk.effects[count];

			if (currPerkEffect.flags.effectType == "bonus" && currPerkEffect.flags.effectSubType == "extraAction" && currPerkEffect.flags.path == whatAction.id)
			{
				return true;
			}

			count++;
		}
		return false;
	}

	getTotalPerkCost(perkCostType)
	{
		var ownedPerkClones = this.getProcessedItems()["perk"];
		var totalCost = 0;

		if (ownedPerkClones)
		{
			var count = 0;
			while (count < ownedPerkClones.length)
			{
				var currPerk = ownedPerkClones[count];
				if (currPerk.data.cost.attributeType == perkCostType)
				{
					totalCost += currPerk.data.cost.amount;
				}
				count++;
			}
		}

		return totalCost;
	}
	

	getTotalCost(whatItems)
	{
		var totalCost = 0;
		for (let [key, item] of Object.entries(whatItems))
		{
			// Calculate the modifier using d20 rules.
			// prime.mod = Math.floor((prime.value - 10) / 2);
			item.cost = PrimePCActor.primeCost(item.value);
			totalCost += item.cost;
			// mod will go but lets see what we get
			item.mod = item.cost;
		}
		return totalCost;
	}

	updateOwnedItemValues()
	{
		this.updateWeightAndValue();

		this.updateHealthAndMind();
		this.updateArmourValues();
		this.updateWardValues();

		//var result = await this.update(this.data);
	}

	updateWeightAndValue()
	{
		this.data.data.totalWeight = this.getTotalWeight();
		this.data.data.equipmentCostPersonal = this.getTotalCostByType("personal");
		this.data.data.equipmentCostShip = this.getTotalCostByType("ship");
		
	}


	updateHealthAndMind()
	{
		this.data.data.health.wounds.max = this.data.data.health.wounds.base + this.getStatBonusesFromItems("health.wounds.max");
		this.data.data.health.resilience.max = this.data.data.health.resilience.base + this.getStatBonusesFromItems("health.resilience.max");
		this.data.data.mind.insanities.max = this.data.data.mind.insanities.base + this.getStatBonusesFromItems("mind.insanities.max");
		this.data.data.mind.psyche.max = this.data.data.mind.psyche.base + this.getStatBonusesFromItems("mind.psyche.max");
	}

	updateArmourValues()
	{
		var currentArmour = this.getMostResilientArmour(this.data.items);
		
		this.data.data.armour.protection.value = currentArmour.data.protection + this.getStatBonusesFromItems("armour.protection.value");
		this.data.data.armour.protection.max = currentArmour.data.protection + this.getStatBonusesFromItems("armour.protection.max");

		var initialMaxValue = this.data.data.armour.resilience.max
		this.data.data.armour.resilience.max = currentArmour.data.armourResilience + this.getStatBonusesFromItems("armour.resilience.max");
		
		// If they were the same initially or the value is now higher than the max, adjust accordingly.
		if (this.data.data.armour.resilience.value == initialMaxValue || this.data.data.armour.resilience.value > this.data.data.armour.resilience.max)
		{
			this.data.data.armour.resilience.value = currentArmour.data.armourResilience + this.getStatBonusesFromItems("armour.resilience.max");
		}
	}
	updateWardValues()
	{		
		this.data.data.ward.stability.value = this.getStatBonusesFromItems("ward.stability.max");
		this.data.data.ward.stability.max = this.getStatBonusesFromItems("ward.stability.max");

		var initialMaxValue = this.data.data.ward.psyche.max
		this.data.data.ward.psyche.max = this.getStatBonusesFromItems("ward.psyche.max");
		
		// If they were the same initially or the value is now higher than the max, adjust accordingly.
		if (this.data.data.ward.psyche.value == initialMaxValue || this.data.data.ward.psyche.value > this.data.data.ward.psyche.max)
		{
			this.data.data.ward.psyche.value = this.getStatBonusesFromItems("ward.psyche.max");
		}
	}

	getMostResilientArmour(items)
	{
		var bestArmour =
		{
			data: {armourResilience: 0, protection: 0}
		};
		var currItem = null;
		var count = 0;
		while (count < items.length)
		{
			currItem = items[count];
			if (currItem.type == "armour" && currItem.data.isWorn && currItem.data.armourResilience > bestArmour.data.armourResilience)
			{
				bestArmour = currItem;
			}
			count++;
		}
		return bestArmour;		
	}
	
	getTotalWeight()
	{
		var totalWeight = 0;
		this.items.forEach(function(currItem, key, map)
		{
			var weight = currItem.data.data.weight;
			var parsedWeight = parseInt(weight);
			if (weight &&  !isNaN(parsedWeight))
			{
				totalWeight += parsedWeight;
			}
		});
		return totalWeight;
	}

	getTotalCostByType(costType)
	{
		var totalCost = 0;
		this.items.forEach(function(currItem, key, map)
		{
			if (currItem.data.data.valueType == costType)
			{
				var cost = currItem.data.data.valueAmount;
				var parsedCost = parseInt(cost);
				if (cost &&  !isNaN(parsedCost))
				{
					totalCost += parsedCost;
				}
			}
		});
		return totalCost;
	}

	getStatBonusesFromItems(whatStatDataPath)
	{
		var ownedItemClones = this.getProcessedItems();
		var totalAdjustments = 0;

		for (var itemType in ownedItemClones)
		{
			var currItemClones = ownedItemClones[itemType]
			if (ownedItemClones && currItemClones)
			{
				var count = 0;
				while (count < currItemClones.length)
				{
					var currItem = currItemClones[count];
					var adjustment = this.getItemAdjustment(currItem, whatStatDataPath);
					totalAdjustments += adjustment;
					count++;
				}
			}
		}

		return totalAdjustments;
	}

	getItemAdjustment(whatItem, whatStatDataPath)
	{
		var itemStateAdjustments = 0;
		var count = 0;
		while (count < whatItem.effects.length)
		{
			let currEffect = whatItem.effects[count];
			if (currEffect.flags.effectType == "bonus" && currEffect.flags.effectSubType == "actorStatBonus" && currEffect.flags.path == whatStatDataPath)
			{
				var parseValue = parseInt(currEffect.flags.value);
				if (!isNaN(parseValue))
				{
					itemStateAdjustments += parseValue;
				}
				else
				{
					console.error("ERROR: Found a stat adjustment value I couldn't turn into a bonus. Item / Effect", whatItem, currEffect);
				}
			}
			count++;
		}

		return itemStateAdjustments
	}

	static primeCost(num)
	{
		if (num === 0) return 0;
		return (num * (num + 1)) / 2;
	}

	
}