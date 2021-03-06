var required = function(value, name) {
  if (!value) {
    return name + ' is required';
  }
};

function createExpenseSchema(name, description) {
  var expenseSchema = {
    name: name,
    value: {
      __type: Number,
      __validators: [function(value) {
        if (!value) {
          return name + ' is required';
        }
      }]
    },
    description: description
  };
  return expenseSchema;
}

function getTotalExpenses(expenses) {
  var keys = expenses.__keys,
    total = 0;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key !== 'total' && expenses[key] && expenses[key].value) {
      total += expenses[key].value;
    }
  }
  return total;
}

function sum(arr, prop) {
  if (!arr || !arr.length) {
    return 0;
  }

  var total = 0;
  for (var i = 0; i < arr.length; i++) {
    total += arr[i][prop] || 0;
  }
  return total;
}

/**
 * Monthly Income
 */
var monthlyIncomeSchema = {
  occupation: {
    __type: String,
    __validators: [required]
  },
  natureOfBusiness: {
    __type: String,
    __validators: [required]
  },
  employedNetMonthlyIncome: {
    __type: Number,
    __validators: [required]
  },
  selfEmployedNetMonthlyIncome: {
    __type: Number,
    __validators: [required]
  },
  netRentalIncome: {
    __type: Number,
    __validators: [required]
  },
  statePension: {
    __type: Number,
    __validators: [required]
  },
  privatePension: {
    __type: Number,
    __validators: [required]
  },
  deptWorkPension: {
    __type: Number,
    __validators: [required]
  },
  workingFamilyTaxCredits: {
    __type: Number,
    __validators: [required]
  },
  taxCredit: {
    __type: Number,
    __validators: [required]
  },
  childBenefit: {
    __type: Number,
    __validators: [required]
  },
  otherIncome: {
    description: {
      __type: String,
      __validators: [function(value) {
        if (this.amount && !value) {
          return 'Other income description is required';
        }
        if (!this.amount && value) {
          return 'Other income description should be blank';
        }
      }]
    },
    amount: Number
  },
  get totalNetMonthlyIncome() {
    return [
      this.employedNetMonthlyIncome, this.selfEmployedNetMonthlyIncome, this.netRentalIncome,
      this.statePension, this.privatePension, this.deptWorkPension, this.workingFamilyTaxCredits,
      this.taxCredit, this.childBenefit, this.otherIncome.amount
    ].reduce(function(prev, curr) {
      return prev + (curr || 0);
    }, 0);
  }
};

/**
 * Applicant
 */
var applicantSchema = {
  id: Number,
  firstName: {
    __type: String,
    __validators: [required]
  },
  lastName: {
    __type: String,
    __validators: [required]
  },
  dob: {
    __type: Date,
    __validators: [required]
  },
  retirementAge: {
    __type: Number,
    __value: 65,
    __validators: [required]
  },
  get fullName() {
    if (this.firstName) {
      return this.firstName + ' ' + (this.lastName || '');
    }
    return '';
  },
  displayName: {
    __enumerable: false,
    __get: function() {
      if (this.fullName) {
        var displayName = this.fullName;
        if (this.age) {
          displayName += ', age ' + this.age;
        }
        if (this.numberOfYearsUntilRetirement) {
          displayName += ', retires in ' + this.numberOfYearsUntilRetirement + ' year(s)';
        }
        return displayName;
      }
      return '';
    }
  },
  get age() {
    if (this.dob) {
      return (new Date()).getFullYear() - this.dob.getFullYear();
    }
  },
  get numberOfYearsUntilRetirement() {
    if (this.retirementAge && this.age > 0) {
      return this.retirementAge - this.age;
    }
  },
  monthlyIncome: monthlyIncomeSchema
};

/**
 * Applicants
 */
var applicantsSchema = {
  items: [applicantSchema],
  get hasApplicants() {
    return !!this.items.length;
  },
  get canAddApplicant() {
    return this.items.length < 4;
  },
  addApplicant: function() {
    if (!this.canAddApplicant) {
      return;
    }

    var appl = this.items.create();
    appl.id = +Date.now();
    appl.firstName = '';
    appl.lastName = '';
    this.items.push(appl);
    return appl;
  },
  removeApplicant: function(applicant) {
    if (!this.hasApplicants) {
      return;
    }

    var idx = this.items.indexOf(applicant);

    if (idx !== -1) {

      // remove any items associated with this applicant
      var unsecuredCreditItems = this.__parent.unsecuredCredit.items;
      var i = unsecuredCreditItems.length;
      while (i--) {
        if (unsecuredCreditItems[i].applicantId === applicant.id) {
          unsecuredCreditItems.splice(i, 1);
        }
      }

      return this.items.splice(idx, 1);
    }
  },
  get totalNetMonthlyIncome() {
    return sum(this.items.map(function(item) {
      return item.monthlyIncome;
    }), 'totalNetMonthlyIncome');
  }
};

/**
 * Household Details
 */
var householdSchema = {
  numberOfDependants19OrOver: {
    __type: Number,
    __validators: [required]
  },
  numberOfDependants18OrUnder: {
    __type: Number,
    __validators: [required]
  },
  monthlyExpenditure: {
    essentials: {
      rentOrServiceChange: createExpenseSchema('Shared Ownership Rent / Ground Rent / Service Charge'),
      pensionLifeInsuranceMortgage: createExpenseSchema('Pension / Life Insurance / Mortgage Repayment Vehicle'),
      buildingsAndContentsInsurance: createExpenseSchema('Buildings & Contents Insurance'),
      councilTax: createExpenseSchema('Council Tax'),
      gasElectricHeating: createExpenseSchema('Gas, Electricity, Heating Fuels'),
      water: createExpenseSchema('Water'),
      shopping: createExpenseSchema('Shopping', '(food, toiletries, nappies, cleaning materials, cigarettes, tobacco, papers, lottery, alcohol, etc)'),
      medicalCare: createExpenseSchema('Costs for Medical / Care Assistance', '(TV licence, TV rental, sky/cable subscription, telephone landline, broadband, mobile telephones)'),
      get total() {
        return getTotalExpenses(this);
      }
    },
    livingExpenses: {
      tvInternetPhone: createExpenseSchema('TV, Internet, Sky/Cable, Telephone, Mobile'),
      entertainment: createExpenseSchema('Entertainment & Recreation', '(socialising, eating out, holidays, weekend trips, gym membership, etc)'),
      clothing: createExpenseSchema('Clothing'),
      childRelatedExpenses: createExpenseSchema('Child Related Expenses', '(child maintenance, child care / nursery / school fees, school meals, children\'s activities, etc)'),
      otherExpenses: createExpenseSchema('Other Expenses'),
      get total() {
        return getTotalExpenses(this);
      }
    },
    travelExpenses: {
      numberOfCars: {
        __type: Number,
        __value: 0
      },
      carExpenses: createExpenseSchema('Car Expenses', '(tax, fuel, insurance, MOT, etc for all cars)'),
      otherTravelExpenses: createExpenseSchema('Other Travel Expenses', '(rail, bus, taxi, tube, other)'),
      get total() {
        return getTotalExpenses(this);
      }
    },
    get total() {
      return this.essentials.total +
        this.livingExpenses.total +
        this.travelExpenses.total;
    }
  }
};

/**
 * Loan Details
 */
var loanDetailsSchema = {
  amount: {
    __type: Number,
    __validators: [required]
  },
  term: {
    __type: Number,
    __validators: [required]
  }
};

/**
 * Secured Credit
 */
var securedCreditItemSchema = {
  creditor: {
    __type: String,
    __validators: [required]
  },
  chargeType: {
    __type: Number,
    __validators: [required]
  },
  arrears: {
    __type: Number,
    __validators: [required]
  },
  balance: {
    __type: Number,
    __validators: [required]
  },
  monthlyRepayment: {
    __type: Number,
    __validators: [required]
  },
  toBeRepayed: {
    __type: Boolean
  }
};

var securedCreditSchema = {
  items: [securedCreditItemSchema],
  get itemsToBeRepayed() {
    return this.items.filter(function(item) {
      return item.toBeRepayed;
    });
  },
  get totalArrears() {
    return sum(this.items, 'arrears');
  },
  get totalBalance() {
    return sum(this.items, 'balance');
  },
  get totalMonthlyRepayment() {
    return sum(this.items, 'monthlyRepayment');
  },
  get totalArrearsToBeRepayed() {
    return sum(this.itemsToBeRepayed, 'arrears');
  },
  get totalBalanceToBeRepayed() {
    return sum(this.itemsToBeRepayed, 'balance');
  },
  get totalMonthlyRepaymentToBeRepayed() {
    return sum(this.itemsToBeRepayed, 'monthlyRepayment');
  },
  get totalArrearsRemaining() {
    return sum(this.itemsToBeRepayed, 'arrears');
  },
  get totalBalanceRemaining() {
    return sum(this.itemsToBeRepayed, 'balance');
  },
  get totalMonthlyRepaymentRemaining() {
    return sum(this.itemsToBeRepayed, 'monthlyRepayment');
  }
};

/**
 * Unsecured Credit
 */
var unsecuredCreditItemSubTypes = {
  Credit: 1,
  CCJ: 2,
  IVA: 3
};

var unsecuredCreditItemTypes = [{
  name: 'Credit Card',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Unsecured Loan',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Mail Order',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Store Card',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Hire Purchase',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Revolving Credit',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Bank Overdraft',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Court Order',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'CCJ',
  subType: unsecuredCreditItemSubTypes.CCJ
}, {
  name: 'Default',
  subType: unsecuredCreditItemSubTypes.CCJ
}, {
  name: 'IVA',
  subType: unsecuredCreditItemSubTypes.IVA
}, {
  name: 'Bankruptcy',
  subType: unsecuredCreditItemSubTypes.IVA
}];

var unsecuredCreditItemSchema = {
  creditor: {
    __type: String,
    __validators: [required]
  },
  applicantId: {
    __type: Number,
    __validators: [required]
  },
  creditType: {
    __type: Number,
    __validators: [required]
  },
  balance: {
    __type: Number,
    __validators: [required]
  },
  monthlyRepayment: {
    __type: Number,
    __validators: [required]
  },
  toBeRepayed: {
    __type: Boolean
  }
};

var unsecuredCreditSchema = {
  items: [unsecuredCreditItemSchema],
  get ccjAndDefaults() {
    var creditType;
    return this.items.filter(function(item) {
      creditType = unsecuredCreditItemTypes[item.creditType];
      return creditType && creditType.subType === unsecuredCreditItemSubTypes.CCJ;
    });
  },
  get ivaAndBankruptcies() {
    var creditType;
    return this.items.filter(function(item) {
      creditType = unsecuredCreditItemTypes[item.creditType];
      return creditType && creditType.subType === unsecuredCreditItemSubTypes.IVA;
    });
  },
  get credits() {
    var creditType;
    return this.items.filter(function(item) {
      creditType = unsecuredCreditItemTypes[item.creditType];
      return creditType && creditType.subType === unsecuredCreditItemSubTypes.Credit;
    });
  },
  get itemsToBeRepayed() {
    return this.items.filter(function(item) {
      return item.toBeRepayed;
    });
  },
  get totalCCJAndDefaultsBalance() {
    return sum(this.ccjAndDefaults, 'balance');
  },
  get totalCCJAndDefaultsMonthlyRepayments() {
    return sum(this.ccjAndDefaults, 'monthlyRepayment');
  },
  get totalIVAAndBankruptciesBalance() {
    return sum(this.ivaAndBankruptcies, 'balance');
  },
  get totalIVAAndBankruptciesMonthlyRepayments() {
    return sum(this.ivaAndBankruptcies, 'monthlyRepayment');
  },
  get totalCreditBalance() {
    return sum(this.credits, 'balance');
  },
  get totalCreditMonthlyRepayments() {
    return sum(this.credits, 'monthlyRepayment');
  },
  get totalToBeRepayedBalance() {
    return sum(this.itemsToBeRepayed, 'balance');
  },
  get totalRemainingBalance() {
    return this.totalCCJAndDefaultsBalance + this.totalIVAAndBankruptciesBalance + this.totalCreditBalance - this.totalToBeRepayedBalance;
  },
  get totalRemainingMonthlyRepayments() {
    return this.totalCCJAndDefaultsMonthlyRepayments + this.totalIVAAndBankruptciesMonthlyRepayments + this.totalCreditMonthlyRepayments;
  },
  addUnsecuredCredit: function() {
    var newItem = this.items.create();
    newItem.balance = 0;
    newItem.monthlyRepayment = 0;
    this.items.push(newItem);
    return newItem;
  },
  removeUnsecuredCredit: function(unsecuredCreditItem) {
    var idx = this.items.indexOf(unsecuredCreditItem);

    if (idx !== -1) {
      return this.items.splice(idx, 1);
    }
  }
};


/**
 * Full Assessment
 */
var fullAssessmentSchema = {
  brokerRef: String,
  applicants: applicantsSchema,
  household: householdSchema,
  loanDetails: loanDetailsSchema,
  securedCredit: securedCreditSchema,
  unsecuredCredit: unsecuredCreditSchema
};

module.exports = {
  fullAssessmentSchema: fullAssessmentSchema,
  unsecuredCreditItemTypes: unsecuredCreditItemTypes
};
