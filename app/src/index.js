import Web3 from "web3";
import supplyChainArtifact from "../../build/contracts/SupplyChain.json";

const emptyAddress = "0x0000000000000000000000000000000000000000"

const App = {
  web3: null,
  account: null,
  meta: null,

  contracts: {},
  sku: 0,
  upc: 0,
  metamaskAccountID: emptyAddress,
  ownerID: emptyAddress,
  originFarmerID: emptyAddress,
  originFarmName: null,
  originFarmInformation: null,
  originFarmLatitude: null,
  originFarmLongitude: null,
  productNotes: null,
  productPrice: 0,
  distributorID: emptyAddress,
  retailerID: emptyAddress,
  consumerID: emptyAddress,

  readForm: function () {
    App.sku = $("#sku").val();
    App.upc = $("#upc").val();
    App.ownerID = $("#ownerID").val();
    App.originFarmerID = $("#originFarmerID").val();
    App.originFarmName = $("#originFarmName").val();
    App.originFarmInformation = $("#originFarmInformation").val();
    App.originFarmLatitude = $("#originFarmLatitude").val();
    App.originFarmLongitude = $("#originFarmLongitude").val();
    App.productNotes = $("#productNotes").val();
    App.productPrice = $("#productPrice").val();
    App.distributorID = $("#distributorID").val();
    App.retailerID = $("#retailerID").val();
    App.consumerID = $("#consumerID").val();

    console.log(
      App.sku,
      App.upc,
      App.ownerID,
      App.originFarmerID,
      App.originFarmName,
      App.originFarmInformation,
      App.originFarmLatitude,
      App.originFarmLongitude,
      App.productNotes,
      App.productPrice,
      App.distributorID,
      App.retailerID,
      App.consumerID
    );
  },

  getMetaskAccountID: function () {
    web3 = new Web3(App.web3Provider);

    // Retrieving accounts
    web3.eth.getAccounts(function(err, res) {
        if (err) {
            console.log('Error:',err);
            return;
        }
        console.log('getMetaskID:',res);
        App.metamaskAccountID = res[0];

    })
  },

  initSupplyChain: async function () {
    /// Source the truffle compiled smart contracts
    /// JSONfy the smart contracts
    // $.getJSON(supplyChainArtifact, function(data) {
    //     console.log('data', data);
      // App.contracts.SupplyChain = TruffleContract(supplyChainArtifact);
      // App.contracts.SupplyChain.setProvider(App.web3Provider);
      const { web3 } = this;

      try {
        // get contract instance
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = supplyChainArtifact.networks[networkId];
        console.log('----------------------------------------', networkId, deployedNetwork);
        App.contracts.SupplyChain = new web3.eth.Contract(
          supplyChainArtifact.abi,
          deployedNetwork.address,
        );

        // get accounts
        const accounts = await web3.eth.getAccounts();
        this.account = accounts[0];
      } catch (error) {
        console.error("Could not connect to contract or chain.");
      }

      // App.fetchItemBufferOne();
      // App.fetchItemBufferTwo();
      App.fetchEvents();

    // });

    // return App.bindEvents();
  },
  bindEvents: function() {
    $(document).on('click', App.handleButtonClick);
  },

  handleButtonClick: async function(event) {
    event.preventDefault();

    var processId = parseInt($(event.target).data('id'));
    console.log('processId', processId);

    switch(processId) {
      case 1:
          return await App.harvestItem(event);
      case 2:
          return await App.processItem(event);
      case 3:
          return await App.packItem(event);
      case 4:
          return await App.sellItem(event);
      case 5:
          return await App.buyItem(event);
      case 6:
          return await App.shipItem(event);
      case 7:
          return await App.receiveItem(event);
      case 8:
          return await App.purchaseItem(event);
      case 9:
          return await App.fetchItemBufferOne(event);
      case 10:
          return await App.fetchItemBufferTwo(event);
    }
  },

  harvestItem: function(event) {
    event.preventDefault();

    App.contracts.SupplyChain.methods.harvestItem(
          App.upc,
          App.account,
          App.originFarmName,
          App.originFarmInformation,
          App.originFarmLatitude,
          App.originFarmLongitude,
          App.productNotes
      ).send({from: this.account})
    .then(function(result) {
        $("#ftc-item").text(result);
        console.log('harvestItem',result);
    }).catch(function(err) {
        console.log(err.message);
    });
  },

  processItem: function (event) {
    event.preventDefault();
    var processId = parseInt($(event.target).data('id'));

    App.contracts.SupplyChain.deployed().then(function(instance) {
        return instance.processItem(App.upc, {from: App.metamaskAccountID});
    }).then(function(result) {
        $("#ftc-item").text(result);
        console.log('processItem',result);
    }).catch(function(err) {
        console.log(err.message);
    });
  },

  packItem: function (event) {
    event.preventDefault();
    var processId = parseInt($(event.target).data('id'));

    App.contracts.SupplyChain.deployed().then(function(instance) {
        return instance.packItem(App.upc, {from: App.metamaskAccountID});
    }).then(function(result) {
        $("#ftc-item").text(result);
        console.log('packItem',result);
    }).catch(function(err) {
        console.log(err.message);
    });
  },

  sellItem: function (event) {
    event.preventDefault();
    var processId = parseInt($(event.target).data('id'));

    App.contracts.SupplyChain.deployed().then(function(instance) {
        const productPrice = web3.toWei(1000000, "gwei");
        console.log('productPrice',productPrice);
        return instance.sellItem(App.upc, App.productPrice, {from: App.metamaskAccountID});
    }).then(function(result) {
        $("#ftc-item").text(result);
        console.log('sellItem',result);
    }).catch(function(err) {
        console.log(err.message);
    });
  },

  buyItem: function (event) {
    event.preventDefault();
    var processId = parseInt($(event.target).data('id'));

    App.contracts.SupplyChain.deployed().then(function(instance) {
        const walletValue = web3.toWei(2000000, "gwei");
        return instance.buyItem(App.upc, {from: App.metamaskAccountID, value: walletValue});
    }).then(function(result) {
        $("#ftc-item").text(result);
        console.log('buyItem',result);
    }).catch(function(err) {
        console.log(err.message);
    });
  },

  shipItem: function (event) {
    event.preventDefault();
    var processId = parseInt($(event.target).data('id'));

    App.contracts.SupplyChain.deployed().then(function(instance) {
        return instance.shipItem(App.upc, {from: App.metamaskAccountID});
    }).then(function(result) {
        $("#ftc-item").text(result);
        console.log('shipItem',result);
    }).catch(function(err) {
        console.log(err.message);
    });
  },

  receiveItem: function (event) {
    event.preventDefault();
    var processId = parseInt($(event.target).data('id'));

    App.contracts.SupplyChain.deployed().then(function(instance) {
        return instance.receiveItem(App.upc, {from: App.metamaskAccountID});
    }).then(function(result) {
        $("#ftc-item").text(result);
        console.log('receiveItem',result);
    }).catch(function(err) {
        console.log(err.message);
    });
  },

  purchaseItem: function (event) {
    event.preventDefault();
    var processId = parseInt($(event.target).data('id'));

    App.contracts.SupplyChain.deployed().then(function(instance) {
        return instance.purchaseItem(App.upc, {from: App.metamaskAccountID});
    }).then(function(result) {
        $("#ftc-item").text(result);
        console.log('purchaseItem',result);
    }).catch(function(err) {
        console.log(err.message);
    });
  },

  fetchItemBufferOne: function () {
///   event.preventDefault();
///    var processId = parseInt($(event.target).data('id'));
    App.upc = $('#upc').val();
    console.log('upc',App.upc);

    App.contracts.SupplyChain.methods.fetchItemBufferOne(App.upc).call()
    .then(result => {
      $("#ftc-item").text(result);
      console.log('fetchItemBufferOne', result);
    }).catch(err => {
      console.log(err.message);
    });
  },

  fetchItemBufferTwo: function () {
///    event.preventDefault();
///    var processId = parseInt($(event.target).data('id'));

    App.contracts.SupplyChain.methods.fetchItemBufferTwo(App.upc).call()
    .then(function(result) {
      $("#ftc-item").text(result);
      console.log('fetchItemBufferTwo', result);
    }).catch(function(err) {
      console.log(err.message);
    });
  },

  fetchEvents: function () {
    // if (typeof App.contracts.SupplyChain.currentProvider.sendAsync !== "function") {
    //     App.contracts.SupplyChain.currentProvider.sendAsync = function () {
    //         return App.contracts.SupplyChain.currentProvider.send.apply(
    //         App.contracts.SupplyChain.currentProvider,
    //             arguments
    //       );
    //     };
    // }
    console.log('fetching events');
    App.contracts.SupplyChain.events.allEvents(function(err, log){
      console.log('+++++++++++++++++++++++++', log)
      if (!err) {
        $("#ftc-events").append('<li>' + log.event + ' - ' + log.transactionHash + '</li>');
      }
    });
  },

  start: async function() {
    App.readForm();
    // App.getMetaskAccountID();
    App.bindEvents();
    await App.initSupplyChain();
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
