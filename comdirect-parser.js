

let getPrice = async function (text) {
    // get price
    let regex = /<span class="realtime-indicator--value text-size--xxlarge text-weight--medium">([\s ]+)?([0-9\.]+,[0-9]+)([\s ]+)?<\/span>/gmi;
    let match = regex.exec(text);
    if(match == null || match[2] ===undefined){
        regex = /<span class="text-size--xxlarge text-weight--medium">([\s ]+)?([0-9\.]+,[0-9]+)([\s ]+)?<\/span>/gmi;

        match = regex.exec(text);
        if(match == null || match[2] ===undefined) {
            throw new Error("ERROR can not get current price");
        }
    }
    let currentPrice = match[2];

    return currentPrice;
};

let getName = async function (text) {
    // get name
    /*
    <h1 class="headline headline--h1 headline--full-width headline--inline">
    DEUTSCHE LUFTHANSA
    <span
     */
    regex = /headline--inline\">((.|\s|\S)*?)<span/gmi;
    match = regex.exec(text);
    if(match == null || match[1] ===undefined) {
		// second try
		regex = /headline headline--h1 headline--full-width headline--inline text-size--medium\">((.|\s|\S)*?)<span/gmi;
		match = regex.exec(text);
		 
		if(match == null || match[1] ===undefined)
			throw new Error("ERROR can not get Name");

    }
    let name = match[1];
    name = name.trim();

    return name;
};

module.exports = Object.assign({ getPrice },{getName});