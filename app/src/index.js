import Web3 from "web3";
import supplyChainArtifact from "../../build/contracts/SupplyChain.json";

const emptyAddress = "0x0000000000000000000000000000000000000000"

const parseError = err => {
  try {
    return err.message.split('message')[1].split('code')[0].slice(3).slice(0, -3)
  } catch {
    return err.message;
  }
};

const stateToString = (state) => {
  if (state == 0) {
      return "Harvested";
  } else if (state == 1) {
      return "Processed";
  } else if (state == 2) {
      return "Packed";
  } else if (state == 3) {
      return "ForSale";
  } else if (state == 4) {
      return "Sold";
  } else if (state == 5) {
      return "Shipped";
  } else if (state == 6) {
      return "Received";
  } else if (state == 7) {
      return "Purchased";
  }
};

class ActionButton{
  constructor(el, defaultState, actionName, actionCompletedName) {
    this.el = el;
    this.defaultState = defaultState;
    this.actionName = actionName;
    this.actionCompletedName = actionCompletedName;
  }

  update(state) {
    this._reset();
    if (state == this.defaultState - 1) { this._enable(); }
    if (state >= this.defaultState) { this._markCompleted(); }
  }

  _reset(cond) {
    this.el.innerHTML = '';
    this.el.appendChild(document.createTextNode(this.actionName + ' '));
    this.el.disabled = true;
  }

  _enable() {
    this.el.innerHTML = '';
    this.el.appendChild(document.createTextNode(this.actionName + ' '));
    this.el.disabled = false;
  }

  _createIcon() {
    const node = document.createElement("i");
    node.classList.add('bi');
    node.classList.add('bi-check-circle-fill');
    return node;
  }

  _markCompleted() {
    this.el.innerHTML = '';
    this.el.disabled = true;
    this.el.appendChild(document.createTextNode(this.actionCompletedName + ' '));
    this.el.appendChild(this._createIcon());
  }
};

const App = {
  web3: null,
  account: null,
  meta: null,
  accountIsFarmer: false,
  accountIsDistributor: false,
  accountIsRetailer: false,
  accountIsConsumer: false,

  // elements
  $upcFetchInputButton: document.getElementById("upcFetchInputButton"),
  $upcFetchInput: document.getElementById("upcFetchInput"),
  $newHarvestButton: document.getElementById("newHarvestButton"),
  $newHarvestSaveButton: document.getElementById("newHarvestSaveButton"),
  newHarvestModal: new bootstrap.Modal('#newHarvestModal'),
  successToast: new bootstrap.Toast('#successToast'),
  $successToastBody: document.getElementById('successToastBody'),
  errorToast: new bootstrap.Toast('#errorToast'),
  $errorToastBody: document.getElementById('errorToastBody'),

  // new harvest form elements
  $newHarvestUPC: document.getElementById("newHarvestUPC"),
  $newHarvestProductNotes: document.getElementById("newHarvestProductNotes"),
  $newHarvestFarmName: document.getElementById("newHarvestFarmName"),
  $newHarvestFarmInfo: document.getElementById("newHarvestFarmInfo"),
  $newHarvestLatitude: document.getElementById("newHarvestFarmLatitude"),
  $newHarvestLongitude: document.getElementById("newHarvestFarmLongitude"),

  // item details elements
  $itemLoading: document.getElementById('itemLoading'),
  $itemContent: document.getElementById('itemContent'),
  $itemSKU: document.getElementById('itemSKU'),
  $itemUPC: document.getElementById('itemUPC'),
  $itemProductPrice: document.getElementById('itemProductPrice'),
  $itemFarmName: document.getElementById('itemFarmName'),
  $itemFarmInfo: document.getElementById('itemFarmInfo'),
  $itemFarmLatitude: document.getElementById('itemFarmLatitude'),
  $itemFarmLongitude: document.getElementById('itemFarmLongitude'),
  $itemFarmer: document.getElementById('itemFarmer'),
  $itemDistributor: document.getElementById('itemDistributor'),
  $itemRetailer: document.getElementById('itemRetailer'),
  $itemConsumer: document.getElementById('itemConsumer'),
  $itemFarmerIsOwner: document.getElementById('itemFarmerIsOwner'),
  $itemDistributorIsOwner: document.getElementById('itemDistributorIsOwner'),
  $itemRetailerIsOwner: document.getElementById('itemRetailerIsOwner'),
  $itemConsumerIsOwner: document.getElementById('itemConsumerIsOwner'),
  $txHistoryTable: document.getElementById('txHistoryTable'),

  // action buttons
  harvestButton: new ActionButton(document.getElementById('harvestButton'), 0, 'Harvest', 'Harvested'),
  processButton: new ActionButton(document.getElementById('processButton'), 1, 'Process', 'Processed'),
  packButton: new ActionButton(document.getElementById('packButton'), 2, 'Pack', 'Packed'),
  sellButton: new ActionButton(document.getElementById('sellButton'), 3, 'Sell', 'For sale'),
  buyButton: new ActionButton(document.getElementById('buyButton'), 4, 'Buy', 'Bought'),
  shipButton: new ActionButton(document.getElementById('shipButton'), 5, 'Ship', 'Shipped'),
  receiveButton: new ActionButton(document.getElementById('receiveButton'), 6, 'Receive', 'Receiveed'),
  purchaseButton: new ActionButton(document.getElementById('purchaseButton'), 7, 'Purchase', 'Purchaseed'),

  $processButton: document.getElementById('processButton'),
  $processButtonCheck: document.getElementById('processButtonCheck'),
  $packButton: document.getElementById('packButton'),
  $packButtonCheck: document.getElementById('packButtonCheck'),
  $sellButton: document.getElementById('sellButton'),
  $sellButtonCheck: document.getElementById('sellButtonCheck'),
  $buyButton: document.getElementById('buyButton'),
  $buyButtonCheck: document.getElementById('buyButtonCheck'),
  $shipButton: document.getElementById('shipButton'),
  $shipButtonCheck: document.getElementById('shipButtonCheck'),
  $receiveButton: document.getElementById('receiveButton'),
  $receiveButtonCheck: document.getElementById('receiveButtonCheck'),
  $purchaseButton: document.getElementById('purchaseButton'),
  $purchaseButtonCheck: document.getElementById('purchaseButtonCheck'),

  currentItem: {},
  SupplyChainContract: null,

  showErrorToast: (message) => {
    App.$errorToastBody.setHTML(message);
    App.errorToast.show();
  },

  showSuccessToast: (message) => {
    App.$successToastBody.setHTML(message);
    App.successToast.show();
  },

  showItem: (item) => {
    App.$itemSKU.value = item.sku;
    App.$itemUPC.value = item.upc;
    App.$itemProductPrice.value = item.productPrice;
    App.$itemFarmName.value = item.originFarmName;
    App.$itemFarmInfo.value = item.originFarmInformation;
    App.$itemFarmLatitude.value = item.originFarmLatitude;
    App.$itemFarmLongitude.value = item.originFarmLongitude;
    App.$itemFarmer.value = item.originFarmerID;
    App.$itemDistributor.value = item.distributorID;
    App.$itemRetailer.value = item.retailerID;
    App.$itemConsumer.value = item.consumerID;

    App.$itemFarmerIsOwner.hidden = item.originFarmerID !== item.ownerID;
    App.$itemDistributorIsOwner.hidden = item.distributorID !== item.ownerID;
    App.$itemRetailerIsOwner.hidden = item.retailerID !== item.ownerID;
    App.$itemConsumerIsOwner.hidden = item.consumerID !== item.ownerID;

    const state = parseInt(item.itemState)

    App.harvestButton.update(state);
    App.processButton.update(state);
    App.packButton.update(state);
    App.sellButton.update(state);
    App.buyButton.update(state);
    App.shipButton.update(state);
    App.receiveButton.update(state);
    App.purchaseButton.update(state);
    App.processButton.update(state);
  },

  showTxHistoryEvent(rowIdx, eventName, txHash) {
    let row = App.$txHistoryTable.insertRow(rowIdx);
    row.insertCell(0).innerHTML = rowIdx + 1;
    row.insertCell(1).innerHTML = `<code><strong>${eventName}</strong></code>`;
    row.insertCell(2).innerHTML = `<code>${txHash}</code>`;
  },

  emptyTxHistory() {
    App.$txHistoryTable.innerHTML = '';
  },

  initSupplyChain: async function () {
      const { web3 } = this;

      try {
        // get contract instance
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = supplyChainArtifact.networks[networkId];
        App.SupplyChainContract = new web3.eth.Contract(
          supplyChainArtifact.abi,
          deployedNetwork.address,
        );

        // get accounts
        const accounts = await web3.eth.getAccounts();
        console.log(accounts)
        this.account = accounts[0];
        // await App.SupplyChainContract.methods.addFarmer(accounts[0]).call();
        // await App.SupplyChainContract.methods.addDistributor(accounts[1]).call();
        // await App.SupplyChainContract.methods.addFarmer(accounts[2]).call();
        // await App.SupplyChainContract.methods.addFarmer(accounts[3]).call();
        // App.accountIsFarmer = await App.SupplyChainContract.methods.isFarmer(App.account).call();
        // App.accountIsDistributor = await App.SupplyChainContract.methods.isDistributor(App.account).call();
        // App.accountIsRetailer = await App.SupplyChainContract.methods.isRetailer(App.account).call();
        // App.accountIsConsumer = await App.SupplyChainContract.methods.isConsumer(App.account).call();
      } catch (error) {
        console.error("Could not connect to contract or chain.", error);
      }
  },

  bindElementEvents: function() {
    App.$upcFetchInputButton.addEventListener("click", App.fetchItem,);
    App.$newHarvestButton.addEventListener("click", () => App.newHarvestModal.show());
    App.$newHarvestSaveButton.addEventListener("click", App.harvestItem);
    App.$processButton.addEventListener("click", App.processItem);
    App.$packButton.addEventListener("click", App.packItem);
    App.$sellButton.addEventListener("click", App.sellItem);
    App.$buyButton.addEventListener("click", App.buyItem);
    App.$shipButton.addEventListener("click", App.shipItem);
    App.$receiveButton.addEventListener("click", App.receiveItem);
    App.$purchaseButton.addEventListener("click", App.purchaseItem);
  },

  harvestItem: function() {
    const upc = parseInt(App.$newHarvestUPC.value);

    App.SupplyChainContract.methods.harvestItem(
      upc,
      App.$newHarvestFarmName.value,
      App.$newHarvestFarmInfo.value,
      App.$newHarvestLatitude.value,
      App.$newHarvestLongitude.value,
      App.$newHarvestProductNotes.value,
    )
    .send({from: App.account})
    .then((res) => {
      App.newHarvestModal.hide();
      console.log(res);
      App.showSuccessToast('Item was successfully harvested');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      console.error(err)
      App.showErrorToast(parseError(err));
    });
  },

  processItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.processItem(upc)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully processed');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  packItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.packItem(upc)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully packed');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  sellItem: () => {
    const upc = parseInt(App.$itemUPC.value);
    const price = Web3.utils.toWei("1", "ether"); // make modal

    App.SupplyChainContract.methods.sellItem(upc, price)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully put for sale');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  buyItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.buyItem(upc)
    .send({from: App.account, value: Web3.utils.toWei("1", "ether")})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully bought');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  shipItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.shipItem(upc)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully shipped');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  receiveItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.receiveItem(upc)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully received');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  purchaseItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.purchaseItem(upc)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully purschased');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  fetchItem: () => {
    event.preventDefault();
    const upc = parseInt(App.$upcFetchInput.value);
    App._fetchItem(upc);
  },

  _fetchItem: (upc) => {
    App.SupplyChainContract.methods.fetchItem(upc).call()
    .then(res => {
      App.currentItem = res;
      console.log(res);
      App.showItem(App.currentItem);
      App.fetchItemEventsHistory(upc);
    }).catch(err => {
      console.error(err);
      App.showErrorToast(parseError(err.message));
    });
  },

  fetchItemEventsHistory: async (upc) => {
    const eventList = [
      'Harvested',
      'Processed',
      'Packed',
      'ForSale',
      'Sold',
      'Shipped',
      'Received',
      'Purchased'
    ]
    const options = {fromBlock: 'earliest', toBlock: 'latest'};

    App.emptyTxHistory();
    let count = 0;
    eventList.forEach(async eventName => {
      let events = await App.SupplyChainContract.getPastEvents(eventName, options);
      events = events.filter(e => e.returnValues.upc == upc);
      if (events.length > 0) {
        App.showTxHistoryEvent(count, eventName, events[0].transactionHash);
        console.log([eventName, events[0].transactionHash]);
      }
      count += 1;
    })
  },

  start: async function() {
    await App.initSupplyChain();

    App._fetchItem(1);

    App.bindElementEvents();
  },

};

window.App = App;

window.addEventListener("load", function() {
  if (window.ethereum) {
    // use MetaMask's provider
    App.web3 = new Web3(window.ethereum);
    window.ethereum.enable(); // get permission to access accounts
  } else {
    console.warn(
      "No web3 detected. Falling back to http://127.0.0.1:8545. You should remove this fallback when you deploy live",
    );
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    App.web3 = new Web3(
      new Web3.providers.HttpProvider("http://127.0.0.1:8545"),
    );
  }

  App.start();
});
