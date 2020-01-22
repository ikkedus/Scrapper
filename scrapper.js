
const wiki = require("node-wikipedia")
const cheerio = require('cheerio')

const fs = require('fs');




Array.prototype.contains = function(value) {
	for(var i=0; i< this.length; i++){
		if(this[i] == value)
			return true;
    }
	return false;
}

String.prototype.replaceAll = function(str1, str2, ignore) 
{
    return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
} 

let datasetMatches = [];
let datasetFighters = [];


function getValue(cheerio,element)
{
    return cheerio(element).text().replace("\n","")
}


function matchWikiToData(pageTitle,tableClass)
{

    wiki.page.data(pageTitle,{content:true},function(res){
        if(res == undefined) return;
        if(res.text == undefined) return;
        let $ = cheerio.load(res.text["*"]);
        let tables = $(tableClass+" tbody");
        let scrappedTitles = $("h2 .mw-headline");
        tableToFighters($,tables);
        let titles = [];
        scrappedTitles.each((i,el) =>{
            if (i ==0 || i > scrappedTitles.length -3)
            {
                return;
            }
            titles.push($(el).text());
        });

        let data = [];
        tables.each((i,el)=>{
            let rows = $(el).find("tr").children().not('th').parent();
            rows.each((j,x)=>{
                let cells = $(x).find('td');
                data.push(new DataObj(getValue($,cells[0]),getValue($,cells[1]),getValue($,cells[2]),getValue($,cells[3]),getValue($,cells[4]),getValue($,cells[5]),getValue($,cells[6]),titles[i]))
            })
        })
        addToDataset(datasetMatches,data);
    })
}
function tableToFighters(cheerio,element)
{
    let $ = cheerio;

    $(element).find("a").each((i,el)=>{
        let page = $(el).attr("href").split("/")[2]
        fighterWikiToData(page);
    })
}
function addToDataset(set,data)
{   
    if(!set.contains(data))
    {
        set.push(data);
    }
}


function fighterWikiToData(page)
{
    wiki.page.data(page,{content:true},function(res){
        if(res == undefined) return;
        if(res.text == undefined) return;
        let $ = cheerio.load(res.text["*"]);
        let infobox = $(".infobox tbody")[0];
        let summary = {};
        let mma = {};
        let other = {};
        let trigger = 0;
        let rows = $(infobox).find("tr");
            rows.each((j,x)=>{
                let childs =  $(x).children(); 
                let item = {type: $(childs[0]).text(),value:$(childs[1]).text()}

                
                if(trigger ==3)
                {
                    if(item.value !== "")
                    {
                        mma[item.type] = item.value;
                    }
                }
                if(trigger ==5){
                    if(item.value !== "")
                    {
                        other[item.type] = item.value;
                    }
                }
                if(trigger == 1){
                    if(item.value !== "")
                    {
                        summary[item.type] = item.value;
                    }
                }
                if(trigger == 0)
                {
                    summary["name"]=item.type;
                }
                if(item.value == '' || item.value == "/n")
                {
                    trigger++;
                }
            })
        let fighter = {page:page,summary:summary,mma:mma,other:other};
        addToDataset(datasetFighters,fighter)
    });
}

function getlinks(page)
{
    let links = [];
    wiki.page.data(page,{content:true},function(res){
        
        for (let index = 0; index < res.links.length; index++) {
            const element = res.links[index]["*"];
            
            if(element.includes(" in M-1 "))
            {
                let text = "";
                text += element.replaceAll(" ","_");
                //console.dir(text);
                matchWikiToData(text,".toccolours")
            }
        }   
    });

}

function saveToFile(inputdata,file)
{
    fs.writeFileSync(file,JSON.stringify(inputdata));
}




getlinks("List_of_M-1_Global_events");

setTimeout(()=>{
    saveToFile(datasetFighters,"fighter.json")
    saveToFile(datasetMatches,"matches.json")
},300*1000)

class DataObj 
{
    constructor(weight,win,lose,meth,rnd,time,notes,contest)
    {
        this.WeightClass =weight;
        this.Winner =win;
        this.Loser= lose;
        this.Method= meth;
        this.Round= rnd;
        this.Time= time;
        this.Notes= notes;   
        this.Contest=contest;
    }
}