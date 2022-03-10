const display = document.querySelector('#displayResponse');
const formSubmit = document.querySelector('#submitNewSymbol');
const mainTable = document.querySelector('#mainListTable');
const mainTableBody = document.querySelector('#mainListTableBody');
const symbolInput1 = document.getElementById('inputSymbol1');
const symbolInput2 = document.getElementById('vs-symbol-select');
const sortingBtns = document.querySelectorAll('.sorting-btn');


/* -- EVENT LISTENER FOR ADDING NEW SYMBOL TO LIST */
formSubmit.addEventListener('click', async (e) => {
    let input1 = symbolInput1.value;
    let input2 = symbolInput2.value;
    let symbolPair = {};

    // symbols must be letters only
    if (isOnlyLetters(input1) && isOnlyLetters(input2)) {
        let uniqID = chance.guid();
        symbolPair = {
            symbol1: input1.toUpperCase(),
            symbol2: input2.toUpperCase(),
            ID: uniqID,
            status: "Open"
        };
    } else {
        alert("Invalid symbol");
        return
    };
    
    // make a test request to see if symbol exists or not, if it does exist, ass to local storage, otherwise alert user
    let testURL = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbolPair.symbol1}${symbolPair.symbol2}`;
    let testping = await fetch(testURL).then((response) => {
        if (response.status >= 400 && response.status < 600) {
            testResult = "Server error";
            return testResult;
        } else {
            testResult = "passed";
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
            location.reload();
            return testResult;
        }
        }).catch(error => {
            alert("Symbol not found");
            testResult = "failed";
            console.log(error);
            console.log("catched error")
            return testResult;
        });
    console.log("testping result: " + testping);
});

/* GET CURRENT AVERAGE PRICE FOR A SYMBOL PAIR */
async function getCurrentPrice(symbol1, symbol2) {
    const start = Date.now();
    symbol2 = symbol2.toUpperCase();
    symbol1 = symbol1.toUpperCase();
    let currentPriceURL = `https://api.binance.com/api/v3/avgPrice?symbol=${symbol1}${symbol2}`;
    let response = await fetch(currentPriceURL);
    let data = await response.json();
    let price = parseFloat(data.price).toFixed(2);
    const duration = Date.now() - start
    return price;
}

/* GET 24hr DATA FOR A SYMBOL PAIR */
async function getDailyData(symbol1, symbol2) {
    const start = Date.now();
    symbol2 = symbol2.toUpperCase();
    symbol1 = symbol1.toUpperCase();
    let dailyDataURL = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol1}${symbol2}`;
    let response = await fetch(dailyDataURL);
    let data = await response.json();
    const duration = Date.now() - start
    return data;
};

/* GET HISTORICAL DATA FOR A SYMBOL PAIR */
async function getHistoricalData(symbol1, symbol2) {
    const start = Date.now();
    symbol1.toUpperCase();
    symbol2.toUpperCase();
    let historicalDataURL = `https://api.binance.com/api/v3/klines?symbol=${symbol1}${symbol2}&interval=1d&limit=365`
    let response = await fetch(historicalDataURL);
    let data = await response.json();
    const duration = Date.now() - start
    return data;
}


/* FETCH USERS WATCHLIST FROM LOCAL STORAGE AND ADD THEM TO MAIN LIST ALONG WITH EVENT LISTENERS */
async function fetchUserList() {

    // if user currently has no watchlist, give a default watchlist and save to local storage
    let symbols = JSON.parse(localStorage.getItem('watchListSymbols'));
    if (symbols === null || symbols.length == 0) {
        symbols = [];
        let defaultSymbols = ["BTC", "ETH", "LUNA", "SOL", "AVAX", "DOT", "DOGE"];
        for (let i = 0; i < defaultSymbols.length; i++) {
            let ID = chance.guid();
            console.log(defaultSymbols[i]);
            let newSymbol = {
                symbol1: defaultSymbols[i],
                symbol2: "USDT",
                ID: ID
                };
            symbols.push(newSymbol);
            };
        
        console.log(symbols);
        localStorage.setItem('watchListSymbols', JSON.stringify(symbols));
    };

    // clear list
    mainTableBody.innerHTML = "";

    // define values to be used in table
    for (let i = 0; i < symbols.length; i++) {
        let symbol1 = symbols[i].symbol1;
        let symbol2 = symbols[i].symbol2;
        let price = await getCurrentPrice(symbol1, symbol2);
        let dailyData = await getDailyData(symbol1, symbol2);
        let historicalData = await getHistoricalData(symbol1, symbol2);
        let dailyChange = parseFloat(dailyData.priceChangePercent).toFixed(2);
        let volume = parseInt(dailyData.quoteVolume);
        let monthlyChanges = calculateMonthlyChanges(historicalData, price); // Returns array with 1mo, 3mo, 6mo and 12mo performance in decimal
        let ID = symbols[i].ID

        //create row and populate with data 
        let row = `<tr>
                    <td class="table-data symbol">${symbol1}/${symbol2}</td>
                    <td class="table-data price" id="price-${ID}">${price}</td>
                    <td class="table-data dailyPercentChange ${dailyChange > 0 ? "green":"red"}" id="dailyChange-${ID}">${dailyChange}%</td>
                    <td class="table-data dailyVolume" id="dailyVolume-${ID}">${abbreviateNumber(volume)} ${symbol2}</td>
                    <td class="table-data montlyPercentChange ${monthlyChanges[0] > 0 ? "green":"red"}">${(monthlyChanges[0] * 100).toFixed(2)}%</td>
                    <td class="table-data threeMonthPercentChange ${monthlyChanges[1] > 0 ? "green":"red"}">${(monthlyChanges[1] * 100).toFixed(2)}%</td>
                    <td class="table-data sixMonthPercentChange ${monthlyChanges[2] > 0 ? "green":"red"}">${(monthlyChanges[2] * 100).toFixed(2)}%</td>
                    <td class="table-data yearlyPercentChange ${monthlyChanges[3] > 0 ? "green":"red"}">${(monthlyChanges[3] * 100).toFixed(2)}%</td>
                    <td class="table-data chart-btn" table-data-chart-btn><button class="chart-table-btn chart-closed" id="chart-${ID}"><i class="fa-solid fa-chart-line"></i></button></td>
                    <td class="table-data delete-btn" table-data-delete-btn><button class="delete-table-item" id="${ID}">X</button></td>
                  </tr>`
        mainTableBody.innerHTML += row;
    }

    // add websocket to price columns & daily change to display live data for each symbol in list
    for (let i = 0; i < symbols.length; i++) {
        let symbol1 = symbols[i].symbol1;
        let symbol2 = symbols[i].symbol2;
        let ID = symbols[i].ID;

        // add websocket for price, 24hr change and volume
        let priceWS = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol1.toLowerCase()}${symbol2.toLowerCase()}@ticker`);
        priceWS.onmessage = (e) => {

            // load data to variables
            let tickerObj = JSON.parse(e.data);
            let price = tickerObj.c;
            let percentChange = parseFloat(tickerObj.P).toFixed(2);
            let volume = parseInt(tickerObj.q);
            volume = abbreviateNumber(volume);

            // add stream to elements
            let priceElem = document.getElementById(`price-${ID}`);
            if (priceElem == null) {
                // if symbol gets deleted then close the stream
                priceWS.close();
            } else {
                priceElem.innerText = parseFloat(price).toFixed(2);

                let percentChangeElem = document.getElementById(`dailyChange-${ID}`);
                percentChangeElem.innerText = percentChange + "%";

                let volumeElem = document.getElementById(`dailyVolume-${ID}`);
                volumeElem.innerText = `${volume} ${symbol2}`;
            }
        }
    };
    // add event listeners to delete and chart buttons - this can't be done in previous for loop because of innerHTML used
    for (let i = 0; i < symbols.length; i++) {
        let ID = symbols[i].ID;
        let deleteBtn = document.getElementById(`${ID}`);
        deleteBtn.addEventListener('click', (e) => {
            symbols.splice(i, 1);
            let newSymbols = JSON.stringify(symbols);
            localStorage.setItem('watchListSymbols', newSymbols);
            symbols = JSON.parse(localStorage.getItem('watchListSymbols'));
            e.target.parentNode.parentNode.remove();
        });

        let chartBtn = document.getElementById(`chart-${ID}`);
        chartBtn.addEventListener('click', (e) => {
            if (chartBtn.classList.contains("chart-closed")) {
                let rowForChart = `<tr class="tradingview-chart-row" id="tradingviewChart-row-${ID}"></tr>`
                let btnRow = chartBtn.parentNode.parentNode;
                btnRow.insertAdjacentHTML("afterend", rowForChart);

                let cellforChart = document.createElement("td");
                cellforChart.classList.add("tradingview-chart-container");
                cellforChart.setAttribute("id", `tradingviewChart-container-${ID}`);
                cellforChart.setAttribute("colspan", "100%");
                let rowForChartNode = document.getElementById(`tradingviewChart-row-${ID}`);


                rowForChartNode.appendChild(cellforChart);
                cellforChart.innerHTML = `
                <iframe id="tradingview_7704e" src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_7704e&amp;symbol=BINANCE%3A${symbols[i].symbol1}${symbols[i].symbol2}&amp;interval=D&amp;symboledit=1&amp;saveimage=0&amp;toolbarbg=f1f3f6&amp;studies=%5B%5D&amp;theme=dark&amp;style=1&amp;timezone=Etc%2FUTC&amp;studies_overrides=%7B%7D&amp;overrides=%7B%7D&amp;enabled_features=%5B%5D&amp;disabled_features=%5B%5D&amp;locale=en&amp;utm_source=www.tradingview.com&amp;utm_medium=widget_new&amp;utm_campaign=chart&amp;utm_term=BINANCE%3ABTCUSDT"
                 style="width: 90%; height: 50vh; margin: 0 !important; padding: 0 !important;" frameborder="0" allowtransparency="true" scrolling="no" allowfullscreen=""></iframe>`
                
                
            } else if (chartBtn.classList.contains("chart-open")) {
                let rowForChart = document.getElementById(`tradingviewChart-row-${ID}`);
                rowForChart.remove();
            }

            chartBtn.classList.toggle("chart-open");
            chartBtn.classList.toggle("chart-closed");
        })
    }

    // add event listeners for sorting
    sortingBtns.forEach((button) => {
        button.addEventListener('click', () => {
            if (button.getAttribute('sorting') == "none" || button.getAttribute('sorting') == "ascending") {
                sortSymbolListByColumn(mainTableBody, parseInt(button.id), false);
                button.setAttribute('sorting', "descending");
            } else if (button.getAttribute('sorting' == "descending")) {
                sortSymbolListByColumn(mainTableBody, parseInt(button.id), true);
                button.setAttribute('sorting', "ascending");
            }
        })
    });
}

function isOnlyLetters(str) {
    return /^[a-zA-Z]+$/.test(str);
}

function removeNonNumerical(str) {
    return parseFloat(str.replace(/\D/g,''));
}

// used to abbreviate volume numbers
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

    // return values in an array
    return monthlyChanges;
}


/* SORTS COLUMNS DEPENGING ON WHAT COLUMN IS CHOSEN FOR SORTING */
function sortSymbolListByColumn(tableBody, column, asc = true) {
    const directionModifier = asc ? 1 : -1;
    const rows = Array.from(tableBody.querySelectorAll("tr"));
    let sortedRows = [];
    if (column == 0) {
            sortedRows = rows.sort((a,b) => {
            aColValue = (a.querySelector(`td:nth-child(${column + 1})`).textContent.trim());
            bColValue = (b.querySelector(`td:nth-child(${column + 1})`).textContent.trim());
    
            console.log("acol: " + aColValue);
            console.log("bcol: " + bColValue);
            return aColValue > bColValue ? (1 * directionModifier) : (-1 * directionModifier);
        })
    } else if (column == 3) {
            sortedRows = rows.sort((a,b) => {
            aColValue = parseFloat(a.querySelector(`td:nth-child(${column + 1})`).textContent.trim());
            bColValue = parseFloat(b.querySelector(`td:nth-child(${column + 1})`).textContent.trim());
    
            console.log("acol: " + aColValue);
            console.log("bcol: " + bColValue);
            return aColValue > bColValue ? (1 * directionModifier) : (-1 * directionModifier);
        })
    } else {
            sortedRows = rows.sort((a,b) => {
            aColValue = parseFloat(a.querySelector(`td:nth-child(${column + 1})`).textContent.trim());
            bColValue = parseFloat(b.querySelector(`td:nth-child(${column + 1})`).textContent.trim());
    
            console.log("acol: " + aColValue);
            console.log("bcol: " + bColValue);
            return aColValue > bColValue ? (1 * directionModifier) : (-1 * directionModifier);
        })
    }

    // update local storage
    let sortedSymbols = [];
    sortedRows.forEach((row, index) => {
        let rowSymbolPair = row.cells[0].innerText;
        let rowSymbolArray = rowSymbolPair.split("/");
        let uniqID = chance.guid();
        symbolPair = {
            symbol1: rowSymbolArray[0],
            symbol2: rowSymbolArray[1],
            ID: uniqID,
            status: "Open"
        };
        sortedSymbols.push(symbolPair);
    })

    localStorage.setItem('watchListSymbols', JSON.stringify(sortedSymbols));

    // remake list with new sorted array of symbols
    fetchUserList();
}