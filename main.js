const display = document.querySelector('#displayResponse');
const formSubmit = document.querySelector('#symbolForm');
const mainTable = document.querySelector('#mainListTable');
const mainTableBody = document.querySelector('#mainListTableBody');
const symbolInput1 = document.getElementById('inputSymbol1');
const symbolInput2 = document.getElementById('vs-symbol-select');


formSubmit.addEventListener('submit', addSymbolToList);


function addSymbolToList() {
    let input1 = symbolInput1.value;
    let input2 = symbolInput2.value;
    let symbolPair = {};
    if (isOnlyLetters(input1) && isOnlyLetters(input2)) {
        symbolPair = {
            symbol1: input1.toUpperCase(),
            symbol2: input2.toUpperCase(),
            status: "Open"
        };
    } else {
        alert("Invalid symbol");
        return
    };


    let currentSymbols = localStorage.getItem('watchListSymbols');
    if (currentSymbols === null) {
        let symbols = [];
        symbols.push(symbolPair);
        localStorage.setItem('watchListSymbols', JSON.stringify(symbols));
    } else {
        let symbols = JSON.parse(currentSymbols);
        symbols.push(symbolPair);
        localStorage.setItem('watchListSymbols', JSON.stringify(symbols));
    }
    fetchUserList();
}

async function getCurrentPrice(symbol1, symbol2) {
    symbol2 = symbol2.toUpperCase();
    symbol1 = symbol1.toUpperCase();
    let currentPriceURL = `https://api.binance.com/api/v3/avgPrice?symbol=${symbol1}${symbol2}`;
    let response = await fetch(currentPriceURL);
    let data = await response.json();
    let price = parseFloat(data.price).toFixed(2);
    return price;
}

async function getDailyData(symbol1, symbol2) {
    symbol2 = symbol2.toUpperCase();
    symbol1 = symbol1.toUpperCase();
    let dailyDataURL = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol1}${symbol2}`;
    let response = await fetch(dailyDataURL);
    let data = await response.json();
    return data;
};

async function getHistoricalData(symbol1, symbol2) {
    symbol1.toUpperCase();
    symbol2.toUpperCase();
    let historicalDataURL = `https://api.binance.com/api/v3/klines?symbol=${symbol1}${symbol2}&interval=1d&limit=365`
    let response = await fetch(historicalDataURL);
    let data = await response.json();
    return data;
}


async function fetchUserList() {
    let symbols = JSON.parse(localStorage.getItem('watchListSymbols'));
    symbols === null ? symbols = []: null;
    let btnIDList = [];

    // define values to be used in table
    for (let i = 0; i < symbols.length; i++) {
        let symbol1 = symbols[i].symbol1;
        let symbol2 = symbols[i].symbol2;
        let price = await getCurrentPrice(symbol1, symbol2);
        let dailyData = await getDailyData(symbol1, symbol2);
        let historicalData = await getHistoricalData(symbol1, symbol2);
        let dailyChange = parseFloat(dailyData.priceChangePercent).toFixed(2);
        let volume = parseInt(dailyData.quoteVolume);
        let monthlyChanges = calculateMonthlyChanges(historicalData, price);
        let status = symbols[i].status;
        let deleteBtnID = Date.now();
        btnIDList.push(deleteBtnID);

        //create row and populate with data 
        let row = `<tr>
                    <td class="table-data symbol">${symbol1}/${symbol2}</td>
                    <td class="table-data price">${price}</td>
                    <td class="table-data dailyPercentChange ${dailyChange > 0 ? "green":"red"}">${dailyChange}%</td>
                    <td class="table-data dailyVolume">${abbreviateNumber(volume)} ${symbol2}</td>
                    <td class="table-data dailyPercentChange ${monthlyChanges[0] > 0 ? "green":"red"}">${(monthlyChanges[0] * 100).toFixed(2)}%</td>
                    <td class="table-data dailyPercentChange ${monthlyChanges[1] > 0 ? "green":"red"}">${(monthlyChanges[1] * 100).toFixed(2)}%</td>
                    <td class="table-data dailyPercentChange ${monthlyChanges[2] > 0 ? "green":"red"}">${(monthlyChanges[2] * 100).toFixed(2)}%</td>
                    <td class="table-data dailyPercentChange ${monthlyChanges[3] > 0 ? "green":"red"}">${(monthlyChanges[3] * 100).toFixed(2)}%</td>
                    <td class="table-data delete-btn" table-data-delete-btn><button class="delete-table-item" id="${deleteBtnID}">X</button></td>
                  </tr>`
        mainTableBody.innerHTML += row;
    }

    // add event listeners to delete buttons and add websockets - this can't be done in previous for loop because of innerHTML used
    for (let i = 0; i < btnIDList.length; i++) {
        let deleteBtn = document.getElementById(`${btnIDList[i]}`);
        deleteBtn.addEventListener('click', (e) => {
            symbols.splice(i, 1);
            let newSymbols = JSON.stringify(symbols);
            localStorage.setItem('watchListSymbols', newSymbols);
            symbols = JSON.parse(localStorage.getItem('watchListSymbols'));
            e.target.parentNode.parentNode.remove();
        });
        // let ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbols[i].symbol1}${symbols[i].symbol2}@trade`)
        // let ws = new WebSocket()
        // ws.onmessage = (e) => {
        //     let tickerObj = JSON.parse(e.data);
        //     console.log(tickerObj.p);
        // }
    }
};

function isOnlyLetters(str) {
    return /^[a-zA-Z]+$/.test(str);
}

function abbreviateNumber(number){
    let SI_SYMBOL = ["", "k", "M", "B", "T", "P", "E"];

    // what tier? (determines SI symbol)
    let tier = Math.log10(Math.abs(number)) / 3 | 0;

    // if zero, we don't need a suffix
    if(tier == 0) return number;

    // get suffix and determine scale
    let suffix = SI_SYMBOL[tier];
    let scale = Math.pow(10, tier * 3);

    // scale the number
    let scaled = number / scale;

    // format number and add suffix
    return scaled.toFixed(1) + suffix;
}

function calculateMonthlyChanges(data, latestPrice) {
    let monthlyChanges = [];
    // if token has existed on binance over 1mo, calculate monthly change
    if (data.length > 30) {
        // data.length-1 gets todays candle
        let oneMonthClose = data[data.length-31][4];
        let oneMonthChg = (latestPrice - oneMonthClose)/latestPrice;
        monthlyChanges.push(oneMonthChg);
    } else {
        monthlyChanges.push("N/A");
    }
    
    // if token has existed on binance over 3mo, calculate monthly change
    if (data.length > 90) {
        let threeMonthClose = data[data.length-92][4];
        let threeMonthChg = (latestPrice - threeMonthClose)/latestPrice;
        monthlyChanges.push(threeMonthChg);
    } else {
        monthlyChanges.push("N/A");
    }

    // if token has existed on binance over 6mo, calculate monthly change
    if (data.length > 180) {
        let sixMonthClose = data[data.length-184][4];
        let sixMonthChg = (latestPrice - sixMonthClose)/latestPrice;
        monthlyChanges.push(sixMonthChg);
    } else {
        monthlyChanges.push("N/A");
    }

    // if token has existed on binance over 12mo, calculate monthly changes
    if (data.length > 364) {
        let twelveMonthClose = data[0][4];
        let twelveMonthChg = (latestPrice - twelveMonthClose)/latestPrice;
        monthlyChanges.push(twelveMonthChg);
    } else {
        monthlyChanges.push("N/A");
    }

    return monthlyChanges;
}