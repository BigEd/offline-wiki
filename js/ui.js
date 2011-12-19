//stolen from quirksmode
function findPos(obj) {
	var curleft = curtop = 0;
	if (obj.offsetParent) {
	  do {
			  curleft += obj.offsetLeft;
			  curtop += obj.offsetTop;
	  } while (obj = obj.offsetParent);
	}
	return [curleft,curtop];
}
function reposition(){
  var sea = document.getElementById('search');
  var p = findPos(sea);
  document.getElementById('autocomplete').style.top = (p[1] + sea.offsetHeight - 1) + 'px';
  document.getElementById('autocomplete').style.left = p[0] + 'px';
  document.getElementById('autocomplete').style.width = (sea.offsetWidth - 2) + 'px';
}


function scoreResult(result, query){
  /*
    penalize explicit results to restore some semblance of faith in humanity
  */
  var censor = /porn|shit|piss|fuck|cunt|tits|sex|anal|cunnilingus|hentai|penis|vagina|ejaculation/i.test(result) ? Math.E : 0;
  var score = damlev(result.substr(0, query.length), query) * 0.5 + damlev(result.substr(0, query.length).toLowerCase(), query.toLowerCase()) * 2 + Math.abs(query.length - result.length) * 0.1;
  //console.log(result, query, score, censor);
  return score + censor;
}
var lastSearchTime = 0;
var lastArticle = '';

reposition();
autocomplete(document.getElementById('search'), document.getElementById('autocomplete'), function(query, callback){
	if(accessibleIndex < 100) return callback(["Downloading... Please Wait"]);
	runSearch(query, function(results){
		
		var map = {};
		callback(results.map(function(x){
			return x.redirect ? x.pointer : x.title;
		}).filter(function(x){
		  if(map[x]) return 0;
		  return map[x] = 1;
		}).slice(0,15).map(function(x){
			//this is probably one of my cleverest regexes ever
			//return x.replace(new RegExp('('+query.split('').join('|')+')','gi'), '|$1|').replace(/((\|.\|){2,})/g, '<b>$1</b>').replace(/\|/g,'')
			return x.replace(new RegExp('('+query.replace(/[^\w]/g, ' ').replace(/ +/g,'|')+')', 'gi'), '<b>$1</b>')
		}))
	}, true)
}, function(query){
	if(new Date - lastSearchTime > 3141){ //Pi! also 3sec is like google instant's magic number apparnetly too
		document.title = query;
		console.log("pushed state");
    history.pushState({}, '', '?'+query);
	}
	lastSearchTime = new Date;
	loadArticle(query);
});

function incrementSlider(pagesDelta){
	var step = document.getElementById('slider').step - 0;
	document.getElementById('slider').value -= pagesDelta * -step;
	updateIndex();
}



function updateIndex(){
	var val = document.getElementById('slider').value - 0;
	var step = document.getElementById('slider').step - 0;
	var max = document.getElementById('slider').max - 0;	
	lastArticlePos = val + step/2;
	
	document.getElementById('title').innerText = "Index: "+(1+(val/step))+" of "+Math.floor(1+(max/step));	
	readIndex(val - 200, step + 200, function(text){
		document.getElementById('pageitems').innerHTML = '<a href="javascript:incrementSlider(-1)" class="prev">Previous</a> / <a class="next" href="javascript:incrementSlider(1)">Next</a><br>' + text.split('\n').slice(1, -1).map(function(x){
			var title = x.split(/\||>/)[0];
			return '<a href="?'+title+'">'+title+'</a>';
		}).join("<br>");
	});
}

var lastArticlePos = 0;

function loadArticle(query){
  lastArticle = query;
	query = query.replace(/w(ikipedia)?:/,'');
	query = query.replace(/_/g, ' ');
	if(query == ''){
		return;
	}

	if(query == 'Special:Settings'){
    document.getElementById('settings').style.display = ''
    document.getElementById('content').style.display = 'none'
		document.title = document.getElementById('title').innerText = "Settings";	
		document.getElementById('outline').innerHTML = '';
	  return;
	}
  document.getElementById('settings').style.display = 'none'
  document.getElementById('content').style.display = ''
	if(query == 'Special:Random'){
		//this is actually much more complicated than it needs to be. but its probably
		//simpler this way and requires less reafactoring, so meh.
		
		readIndex(Math.floor(accessibleIndex * Math.random()), 400, function(text){
			var title = text && text.split('\n').slice(1,-1).filter(function(x){
				  return !/\>/.test(x)
			  });
			if(title){
			  loadArticle(title[Math.floor(title.length * Math.random())].split(/\||\>/)[0]);
			}
		});
		document.getElementById('title').innerText = "Special:Random";	
		return;
	}
	if(query == 'Special:Index'){
		if(accessibleIndex == 0) return setTimeout(function(){
			loadArticle(query);
		}, 100);
		document.getElementById('title').innerText = "Index";	
		document.title = "Index";
		document.getElementById('content').innerHTML = "<input type=range id=slider> <div id=pageitems>";

		var step = Math.floor((innerHeight - 80) * document.getElementById('content').scrollWidth/271.828 );
		document.getElementById('slider').max = Math.floor(accessibleIndex/step)*step;
		document.getElementById('slider').step = step;
		document.getElementById('slider').value = Math.floor(lastArticlePos/step) * step;

		var lastTime = 0;
		document.getElementById('slider').onchange = function(){
			lastTime = +new Date;
			var closureTime = lastTime;
			setTimeout(function(){
				if(closureTime >= lastTime) updateIndex();
			}, 200)
		}
		document.getElementById('outline').innerHTML = '';
		updateIndex();
		return;
	}
	document.getElementById('title').innerText = "Loading...";	
	reposition();
	readArticle(query, function(title, text, pos){
	  lastArticle = title;
	  
		if(document.title != title){
		  history.replaceState({}, '', '?'+title);
  		scrollTo(0,0);
		};


		document.title = title;
		document.getElementById('title').innerText = title;	

		if(pos) lastArticlePos = pos;
		reposition();
    
    renderWikitext(text, function(html){
  		//var parse_start = +new Date;
      document.getElementById('content').innerHTML = html;
      localStorage.lastArticleHTML = html;
      localStorage.lastArticleTitle = title;
  		//console.log("Article Reflow time", +new Date - parse_start);      
  		parseBoxes();
		  updateOutline();
		  selectOutline();
		  checkLink();
		  checkLinkUncached();
    });
			
	})
}

function parseBoxes(){
  var box = document.querySelector('.wikibox');
  if(box){
    box.className = '';
    var parts = box.innerText.split(/[>|]/);
    var fn = parts.shift().toLowerCase();
    if(fn == 'main'){
      box.innerHTML = '<div class="rellink">Main articles: '+parts.map(function(e){
        return '<a href="?'+e+'">'+e+'</a>';
      }).join(', ')+'</div>'
    }else if(fn == 'see'){
      box.innerHTML = '<div class="rellink">Further information: '+parts.map(function(e){
        return '<a href="?'+e+'">'+e+'</a>';
      }).join(', ')+'</div>'
    }else if(fn == 'convert'){
      box.innerHTML = parts[0] + ' ' + parts[1].replace(/e\d/, function(a){
        return ({
          e6: 'million',
          e9: 'billion'
        })[a] + ' '
      })
    }else if(fn == 'ipa-en'){
      box.innerHTML = '<small>English pronunciation:</small> <a href="?Wikipedia:IPA_for_English">/'+parts[0]+'/</a>';
    }else{
      box.className = 'unknown_box';
    }
    parseBoxes();
  }
}

var renderWorker;
function renderWikitext(text, callback){
	if(renderWorker) renderWorker.terminate();
	var v = document.getElementById('parser').value;
	
  if(v == 'splus'){
    return callback(text.replace(/(\n==+[^=]*?==+\n)/g, '\n$1\n').replace(/\n/g, '<br>')
      .replace(/(""|''|\=\=+)(.*?)(""|''|\=\=+)/g, '<tt>$1$2$3</tt>')
      .replace(/\[\[.*?\]\]/g, function(a){
        return '<tt><a href="?'+a.split('|')[0].replace(/\[|\]/g,'')+'">'+a+'</a></tt>'
      }));
  }else if(v == 'source'){
    return callback('<pre>'+text.replace(/</g, '&lt;').replace(/>/g, '&gt;')+'</pre>')
  }else if(v == 'basic'){
    return callback(basic_wikitext(text));
  }
	
	renderWorker = new Worker('js/render.js');
	renderWorker.addEventListener('error', function(e){ 
    console.log('Rendering error', e);
  }, false);
  var starttime, endtime;
  renderWorker.addEventListener('message', function(e){
    endtime = +new Date;
    console.log("Render time", endtime - starttime);
    callback(e.data);
  }, false);
	renderWorker.postMessage(text);
	starttime = +new Date;
}


function updateOutline(){
  var els = document.getElementById('content').querySelectorAll('h1,h2,h3,h4,h5,h6');
	var ol = document.createElement('ol');
	document.getElementById('outline').innerHTML = '';
	document.getElementById('outline').appendChild(ol);
	var lastnum = 2;
	for(var i = 0; i < els.length; i++){
	  if(els[i].innerText.replace(/[^\<\>\"\'\&;_%\+\=\[\]]/g,'').length > 1) continue;
	  var num = parseInt(els[i].tagName.replace(/[^0-9]/g, ''));
	  if(num > lastnum){
	    var nol = document.createElement('ol');
	    ol.appendChild(nol);
	    ol = nol;
	  }else if(num < lastnum){
	    ol = ol.parentNode;
	  }
	  var lye = document.createElement('li');
	  var lynk = document.createElement('a');
	  lye.appendChild(lynk);
	  els[i].id = els[i].innerText.replace(/[^\w]/g, '');
	  els[i].link = lynk;
	  lynk.href = '#'+els[i].id;
	  lynk.innerText = els[i].innerText;
	  ol.appendChild(lye);
	  lastnum = num
	}
}

function basic_wikitext(text){
	return text.replace(/===([^=\n]+)===\n+/g,'<h3>$1</h3>').replace(/==([^=\n]+)==\n+/g,'<h2>$1</h2>')
						 .replace(/\n\*\* ([^\n]+)/g, '\n<ul><ul><li>$1</li></ul></ul>')
						 .replace(/\n\* ([^\n]+)/g, '\n<ul><li>$1</li></ul>')
						 .replace(/'''([^']+)'''/g, '<b>$1</b>')
						 .replace(/''([^']+)''/g, '<i>$1</i>')
						 .replace(/\n+/g, '<br>')
						 .replace(/\[\[([^\|\]]+)\|([^\]]+)\]\]/g, '<a href="$1">$2</a>');
}
function runSearch(query, callback, fuzzy){
	binarySearch(slugfy(query), 0, accessibleIndex, 200, 800, defaultParser, function(low, high, res){
		readIndex(low, high - low, function(text){

			//console.log(text);
		  var results = text.split('\n').slice(1, -1)
			.filter(function(x){
			  var parts = x.split(/\||\>/), title = parts[0], ptr = parts[1];
			  return title && (fuzzy || (title.toLowerCase().trim().replace(/[^a-z0-9]/g,'') == query.toLowerCase().trim().replace(/[^a-z0-9]/g,'')))
			});
			if(fuzzy != 2){
			  results = results.map(function(x){
				  var parts = x.split(/\||\>/), title = parts[0].replace(/_/g, ' '), ptr = parts[1];
				  return {title: title, pointer: /\>/.test(x) ? ptr : parse64(ptr), redirect: /\>/.test(x), score: scoreResult(title, query)}
			  }).sort(function(a, b){
				  return a.score - b.score
			  })
			}
			callback(results, low);
			
			
				//var display = /\>/.test(x)?ptr:title;
				//scoremap[display] = Math.min(scoremap[display] || Infinity, scoreResult(title, query));
			})
			/*
			var scoremap = {};
			text.split('\n').slice(1).forEach(function(x){
				var parts = x.split(/\||\>/), title = parts[0], ptr = parts[1];
				//var display = /\>/.test(x)?ptr:title;
				//scoremap[display] = Math.min(scoremap[display] || Infinity, scoreResult(title, query));
			});
			callback(Object.keys(scoremap).sort(function(a, b){
				return scoremap[a] - scoremap[b];
			}).slice(0, 15))
	
		})
			*/
	})
}

var redirectCache = {};

function findBlock(query, callback){
	runSearch(query, function(results, pos){
		if(!results[0]){
		  callback(query, 0, 0);
		}else if(results[0].redirect){
			findBlock(results[0].pointer, callback)
		}else{
			callback(results[0].title, results[0].pointer, pos)
		}
	})
}


var linkCache = {};

function checkLink(){
  if(document.title == 'Index') return;
  var link;
  while(link = document.getElementById('content').querySelector('a:not(.checked)')){
    var url = unescape(link.href.replace(/^.*\?|\#.*$/g,'')).toLowerCase().replace(/[^a-z0-9]/g,'');
    //console.log(url);
    if(linkCache[url]){
      if(linkCache[url] == -1){
        link.className += ' new ';
      }
      link.className += ' cached ';
    }
    link.className += ' checked ';
  }
}

function checkLinkUncached(){
  var link = document.getElementById('content').querySelector('a:not(.cached)');
  if(link && document.title != 'Index'){
    var url = unescape(link.href.replace(/^.*\?|\#.*$/g,'')).toLowerCase().replace(/[^a-z0-9]/g,'');
    runSearch(url, function(r){
      linkCache[url] = -1;
      r.forEach(function(e){
        linkCache[e.replace(/(>|\|).*$/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')] = 1;
      });
      if(linkCache[url] == -1){
        link.className += ' new '
      }
      link.className += ' cached ';
      setTimeout(checkLinkUncached, 14);
    }, 2);
  }
}


document.body.onclick = function(e){
  if(e.button == 0  ){
    var link = null;
    if(e.target.tagName.toLowerCase() == 'a'){
      link = e.target;
    }else if(e.target.parentNode.tagName.toLowerCase() == 'a'){
      link = e.target.parentNode;
    }
    if(link){
      if(link.href.replace(/\?.*$/,'') == location.href.replace(/\?.*$/,'')){
        if(unescape(link.href.replace(/\#.*$/,'')) == unescape(location.href.replace(/\#.*$/,'')) && unescape(link.href) != unescape(location.href)){
          return true;
        }
        e.preventDefault();
        history.pushState({}, '', link.href);
        loadArticle(decodeURIComponent(location.search.substr(1)))
      }
    }
  }
}

onpopstate = function(e){
  var title = decodeURIComponent(location.search.substr(1));
  if(lastArticle != title){
    loadArticle(title)
  } 
}

if(decodeURIComponent(location.search.substr(1)) == localStorage.lastArticleTitle){
  document.getElementById('content').innerHTML = localStorage.lastArticleHTML;
}

onscroll = function(){
  selectOutline();
}

function selectOutline(){
  var z;
  while(z = document.querySelector('a.selected')) z.className = '';
  
  try{
    var els = document.getElementById('content').querySelectorAll('h1,h2,h3,h4,h5,h6');
    var i = 0;
    while(findPos(els[i])[1] < scrollY) i++;
    els[i].link.className = 'selected';
  }catch(err){};
}


var articleCache = {};
var worker;


function readArticle(query, callback){
	if(!index || accessibleIndex < 10 || !dump) return setTimeout(function(){
		readArticle(query, callback);
	}, 10);
	findBlock(query, function(title, position, location){

	  title = title.trim();
		if(articleCache[title]) return callback(title, articleCache[title], location);
		readPage(position, function(){
			callback(title, articleCache[title] || "==Page Not Found==", location);
			
		})
	})
}

function readPage(position, callback, blocksize){
	var fr = new FileReader();
	if(worker) worker.terminate();
	worker = new Worker('js/lzma.js');
	worker.addEventListener('error', function(e){ 
    console.log('LZMA decompression error', e);
  }, false);
  var starttime, endtime;
  
  worker.addEventListener('message', function(e){
    endtime = +new Date;
    console.log("Decompression time", endtime - starttime);
  	var block = e.data;
  	var re = /=([^=\n\#\<\>\[\]\|\{\}]+)=\n\n\n\n/g;
  	var matches = re.exec(block), lastIndex = 0;
  	//console.log(block);
		while (matches){
			articleCache[matches[1].trim()] = block.slice(re.lastIndex, (matches = re.exec(block))?matches.index:undefined)
			//console.log(matches[1].trim())
		}
  	callback();
  	//portal 2 is coming tomorrow so this is obligatory
  	//window.companioncube = block;
  }, false);
	fr.onload = function(){
		worker.postMessage(fr.result);
	}
	//fr.readAsBinaryString(blobSlice(dump, position, blocksize || 200000));
	fr.readAsArrayBuffer(blobSlice(dump, position, blocksize || 200000));
	starttime = +new Date;
}
