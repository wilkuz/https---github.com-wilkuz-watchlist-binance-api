const display = document.querySelector('#displayResponse');
const formSubmit = document.querySelector('#symbolForm');
const mainList = document.querySelector('#mainList');
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
}

async function fetchUserList() {
    let symbols = JSON.parse(localStorage.getItem('watchListSymbols'));
    symbols === null ? symbols = []: null;

    for (let i = 0; i < symbols.length; i++) {
        let symbol1 = symbols[i].symbol1;
        let symbol2 = symbols[i].symbol2;
        let price = await getCurrentPrice(symbol1, symbol2);
        let dailyData = await getDailyData(symbol1, symbol2);
        let dailyChange = dailyData.priceChangePercent;
        let status = symbols[i].status;

        if (status == 'Open') {
            let newListItem = document.createElement('li');
            newListItem.innerHTML = `${symbol1}/${symbol2}: ${price} - change today: ${dailyChange}%`;
            let deleteBtn = document.createElement('button');
            deleteBtn.textContent = "X";
            deleteBtn.classList.add("delete-btn");
            deleteBtn.addEventListener('click', (e) => {
                symbols.splice(i, 1);
                let newSymbols = JSON.stringify(symbols);
                localStorage.setItem('watchListSymbols', newSymbols);
                symbols = JSON.parse(localStorage.getItem('watchListSymbols'));
                e.target.parentNode.remove();
            })


            newListItem.appendChild(deleteBtn);
            mainList.appendChild(newListItem);
        }
    }
};

function isOnlyLetters(str) {
    return /^[a-zA-Z]+$/.test(str);
}