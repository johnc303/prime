import { PRIME_DICE_ROLLER } from "./prime_dice_roller.js";

export class PRIME_DICE_POPUP extends Application {
	diceRoller = new PRIME_DICE_ROLLER();
	currentActor = null;
	sortedStats = {};
	selectedPrime = null;
	selectedRefinement = null;
	selectedPrimeValue = 0;
	selectedRefinementValue = 0;
	doublePrime = false;

	constructor(...args) {
		super(...args)
		game.users.apps.push(this);
	}

	static get defaultOptions() {
		const options = super.defaultOptions;
		options.title = game.i18n.localize("PRIME.diceRoller.title");
		options.id = "primeDiceRoller";
		options.template = "systems/prime/templates/dice/roller.html";
		options.closeOnSubmit = true;
		options.popOut = true;
		options.width = 600;
		options.height = "auto";
		options.classes = ["prime-dice"];

		return options;
	}

	async getData() {
		// Return data to the template
		const actors = game.actors.entities;
		const users = game.users.entities;

		const primes = this.getPrimes();
		const refinements = this.getRefinements();
		if (!this.currentActor) {
			this.currentActor = actors[0];
		}
		this.getSortedActorStats(this.currentActor);
		return {
			actors,
			users,
			primes,
			refinements,
			sortedStats: this.sortedStats,
			currentActor: this.currentActor
			/*,
			abilities,
			saves,
			skills,
			specialRolls: LMRTFY.specialRolls,
			rollModes: CONFIG.Dice.rollModes,*/
		};
	}

	getSortedActorStats(currentActor) {

		const primes = currentActor.data.data.primes;
		const refinements = currentActor.data.data.refinements;
		var currEntry = null;
		this.sortedStats = {};
		for (var key in primes) {
			currEntry = primes[key];
			if (!this.sortedStats[currEntry.type]) {
				let localisedTitle = game.i18n.localize("PRIME.refinment_type_" + currEntry.type);
				this.sortedStats[currEntry.type] =
				{
					primes: {},
					refinements: {},
					title: localisedTitle
				}
			}
			this.sortedStats[currEntry.type].primes[key] =
			{
				value: currEntry.value,
				title: game.i18n.localize(currEntry.title),
				description: game.i18n.localize(currEntry.description)
			};
		}
		for (var key in refinements) {
			currEntry = refinements[key];
			this.sortedStats[currEntry.type].refinements[key] =
			{
				defaultPrime: currEntry.related && currEntry.related.length > 0 ? currEntry.related[0] : "",
				value: currEntry.value,
				title: game.i18n.localize(currEntry.title),
				description: game.i18n.localize(currEntry.description)
			};
		}
		return this.sortedStats;
	}

	getPrimes() {
		const primeData = game.system.template.Actor.templates.primes_template.primes
		if (primeData) {
			let primes = [];
			let currPrime = null;
			for (let currAbbrevation in primeData) {
				currPrime = primeData[currAbbrevation];
				primes.push({ name: currAbbrevation, title: game.i18n.localize(currPrime.title) });
			}
			return primes;
		}
		console.error("Unable to find Primes data.");
		return [];
	}

	getRefinements() {
		const refinementData = game.system.template.Actor.templates.refinements_template.refinements;
		if (refinementData) {
			var localisedRefinments = this.getLocalisedRefinments(refinementData);
			var catergorisedRefinementsList = [];

			for (var _currType in localisedRefinments) {
				catergorisedRefinementsList.push({
					name: "null",
					title: game.i18n.localize("PRIME.refinment_type_" + _currType)
				});

				catergorisedRefinementsList = catergorisedRefinementsList.concat(localisedRefinments[_currType]);
			}

			return catergorisedRefinementsList;
		}
		console.error("Unable to find Refinements data.");
		return [];
	}

	getLocalisedRefinments(refinementData) {
		let refinementGroups = {}
		let currGroupType = "";
		let currRefinement = null;
		for (let key in refinementData) {
			currRefinement = refinementData[key];
			currGroupType = currRefinement.type;

			if (!refinementGroups[currGroupType]) {
				refinementGroups[currGroupType] = [];
			}

			refinementGroups[currGroupType].push(
				{
					name: key,
					title: "&nbsp;&nbsp;" + game.i18n.localize(currRefinement.title)
				});

			refinementGroups[currGroupType].sort();
		}
		return refinementGroups;
	}

	render(force, context = {}) {
		// Only re-render if needed
		const { action, data } = context;
		if (action && !["create", "update", "delete"].includes(action)) return;
		//if (action === "update" && !data.some(d => "character" in d)) return;
		if (force !== true && !action) return;
		return super.render(force, context);
	}

	selectPrime(event) {
		const selectedRefinementClass = "selectedRefinement";
		const doubledSelectedClass = "doubled";

		const selectedPrimeClass = "selectedPrime";
		const primeDataKey = "data-prime-key"
		const primeDataValue = "data-prime-value";

		console.log("select prime", event);

		const thisElement = $(event.delegateTarget);
		const thisKey = thisElement.attr(primeDataKey);

		if (this.selectedPrime == thisKey) {

			if (this.doubled) {
				this.selectedPrime = null;
				this.doubled = false;
				thisElement.removeClass(doubledSelectedClass);
				thisElement.removeClass(selectedPrimeClass);
				this.selectedPrimeValue = 0;
			} else {
				this.doubled = true;
				thisElement.addClass(doubledSelectedClass);
				this.element.find("." + selectedRefinementClass).removeClass(selectedRefinementClass);

				this.selectedRefinement = null;
				this.selectedRefinementValue = 0;
			}
		} else {
			if (this.selectedPrime) {
				this.element.find("." + selectedPrimeClass).removeClass(selectedPrimeClass);
			}
			thisElement.addClass(selectedPrimeClass);
			this.selectedPrime = thisKey;
			this.selectedPrimeValue = Number.parseInt(thisElement.attr(primeDataValue), 10);
		}

		this.updateRoll(event);
	}


	selectRefinement(event) {
		const selectedRefinementClass = "selectedRefinement";
		const refinementDataKey = "data-refinement-key"
		const refinementDataValue = "data-refinement-value";
		const refinementDataDefault = "data-refinement-default-prime"

		const selectedPrimeClass = "selectedPrime";
		const primeDataKey = "data-prime-key"
		const primeDataValue = "data-prime-value";
		const doubledSelectedClass = "doubled";

		console.log("select  refinement", event);

		const thisElement = $(event.delegateTarget);
		const thisKey = thisElement.attr(refinementDataKey);

		if (this.selectedRefinement == thisKey) {
			thisElement.removeClass(selectedRefinementClass);
			this.selectedRefinement = null;
			this.selectedRefinementValue = 0;
		} else {

			if (this.selectedRefinement) {
				this.element.find("." + selectedRefinementClass).removeClass(selectedRefinementClass);
			} else if (this.selectedPrime) {
				if (this.doubled) {
					this.doubled = false;
					this.element.find("." + doubledSelectedClass).removeClass(doubledSelectedClass);
				}
			} else {
				const defaultPrime = thisElement.attr(refinementDataDefault);
				if (defaultPrime) {
					this.selectedPrime = defaultPrime;
					const primeElement = this.element.find('.selectPrime[' + primeDataKey + '="' + defaultPrime + '"]');
					primeElement.addClass(selectedPrimeClass);
					this.selectedPrimeValue = Number.parseInt(primeElement.attr(primeDataValue), 10);
				}
			}

			thisElement.addClass(selectedRefinementClass);
			this.selectedRefinement = thisKey;
			this.selectedRefinementValue = Number.parseInt(thisElement.attr(refinementDataValue), 10);
		}
		this.updateRoll(event);
	}

	updateRoll(event) {

		const primeData = game.system.template.Actor.templates.primes_template.primes
		const refinementData = game.system.template.Actor.templates.refinements_template.refinements;

		const rollButton = this.element.find(".rollPrimeDice");
		if (this.selectedPrime) {
			const localizedPrime = game.i18n.localize(primeData[this.selectedPrime].title);
			if (this.doubled) {
				rollButton.text("Roll " + localizedPrime
					+ " twice. (" + this.selectedPrimeValue + " + " + this.selectedPrimeValue + " + ?)");
			} else if (this.selectedRefinement) {
				const localizedRefinement = game.i18n.localize(refinementData[this.selectedRefinement].title);

				rollButton.text("Roll " + localizedPrime + " with " + localizedRefinement
					+ ". (" + this.selectedPrimeValue + " + " + this.selectedRefinementValue + " + ?)");
			} else {
				rollButton.text("Roll " + localizedPrime + " once. (" + this.selectedPrimeValue + " + ?)");
			}
		} else if (this.selectedRefinement) {
			const localizedRefinement = game.i18n.localize(refinementData[this.selectedRefinement].title);
			rollButton.text("Roll " + localizedRefinement + " once. (" + this.selectedRefinementValue + " + ?)");
		} else {
			rollButton.text("Roll!");
		}

	}


	selectActor(event) {
		console.log("select  actor", event);
		const newActor = game.actors.get(event.target.value);
		if (this.currentActor != newActor) {
			this.currentActor = newActor;
			this.getSortedActorStats(this.currentActor);
			this.selectedPrimeValue = 0;
			this.selectedRefinementValue = 0;
			this.selectedPrime = null;
			this.selectedRefinement = null;
			this.doubled = false;
			this.render(false, { action: "update" });
		}
	}

	activateListeners(html) {
		super.activateListeners(html);
		this.element.find(".rollPrimeDice").click((event) => this.diceRoller.rollPrimeDice(event, true));
		this.element.find(".selectPrime").click((event) => this.selectPrime(event));
		this.element.find(".selectRefinement").click((event) => this.selectRefinement(event));
		const actorSelect = this.element.find("#primeDiceRollerActorSelect");
		if (actorSelect.length > 0) {
			const currentSelect = this.element.find("#primeDiceRollerActorSelect option[value='" + this.currentActor.id + "']");
			currentSelect.attr('selected', 'selected');
			actorSelect.change((event) => this.selectActor(event));
		}
	}
}