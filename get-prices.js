import fs from 'fs'; 
import { parse } from 'csv-parse';
import fetch from "node-fetch";

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function readFile(filename) {
    let records = []
    return new Promise(resolve => {
        fs.createReadStream(filename)
            .pipe(parse({delimiter: ','}))
            .on("data", (data) => {
                records.push(data);
            })
            .on("end", () => {
                resolve(records)
            });
    })
}

const round2 = (number) => {
    return Math.round(number * 100) / 100
}

const getPrices = async (cards) => {
    const priceSheet = [];

    for ( const card of cards) {
        const [name, set, special, count] = card;
    
        const query = encodeURIComponent(name);
        // Set a sleep timer per scryfall's API limitations.
        await sleep(75);
        const response = await fetch(`https://api.scryfall.com/cards/search?unique=prints&q=${query}`)
        const json = await response.json();

        let matchingPrint = null;
        if ( 404 !== json.status ) {
            json.data.forEach((print) => {
                if (
                    print.name.toLowerCase() === name.toLowerCase() 
                    && print.set.toLowerCase() === set.toLowerCase()
                    && !print.promo
                ) {
                    matchingPrint = print
                }
            });
        } else {
            console.log( 'error', name)
        }

        if (null !== matchingPrint) {
            if ('promo' !== special) {
                const url = matchingPrint.purchase_uris.tcgplayer;
                let price = 'y' === special ? matchingPrint.prices.usd_foil : matchingPrint.prices.usd;

                if (!price) {
                    card.push('cannot find price');
                } else {
                    card.push('card found');
                    card.push(price)
                    card.push(round2(price * .75))
                    card.push(round2(price * .75 * count))
                    card.push(url)
                }
            } else {
                card.push('cannot get promos');
            }

            priceSheet.push(card);
        } else {
            card.push('cannot find card with matching name')
            priceSheet.push(card)
        }
    }
    return priceSheet;
}


const file = await readFile('cards.csv')
const prices = await getPrices(file)

let csvContent = '';
prices.forEach(function(rowArray) {
    let row = rowArray.map(item => 'string' === typeof item ? item.replace(/,/g, "") : item);
    row = row.join(",");
    csvContent += row + "\r\n";
});

fs.writeFile(
    'card-prices.csv', 
    csvContent, 
    function(err) {
        if (err) throw err;
        console.log('file saved');
    }
);