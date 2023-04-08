let captures = [],
    selectedDay = null;

let common = {
    months: [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
    years: new Date().getFullYear() - 1996 + 1
};

let config = {
    graph: {
        width: 200,
        height: common.years * 12,
        span: 3 / 4,
        xScale: 1,
        yScale: 2,
        balance: 5
    },
    calendar: {
        initialColor: '#fdd',
        minBright: 0.5,
        maxSaturate: 10,
        threshold: 10
    },
    captures: {
        initialColor: '#f55'
    },
    hueIncrement: 100
};

let url = new URLSearchParams(location.search).get('url');

if (url != null && !url.endsWith('*')) {
    document.querySelector('.search-box').value = url;
    
    fetch('https://corsproxy.io/?' + encodeURIComponent('https://web.archive.org/cdx/search/cdx?url=' + url + '&fl=timestamp,statuscode,original&collapse=timestamp&output=json'))
    .then(r => r.json()).then(json => {
        if (json.length == 0) {
            return;
        }
        
        captures = json.slice(1).map(c => ({
            date:   c[0],
            year:   parseInt(c[0].substring(0, 4)),
            month:  parseInt(c[0].substring(4, 6)),
            day:    parseInt(c[0].substring(6, 8)),
            time:   `${c[0].substring(8, 10)}:${c[0].substring(10, 12)}:${c[0].substring(12, 14)}`,
            status: c[1] == '-' ? 200 : parseInt(c[1]),
            url:    c[2]
        }));
        
        createYearGraph();
        createMonthGrid();
        createCaptureList();
        
        selectYear(captures[captures.length - 1].year - 1996);
        document.querySelector('.browse-container').style.display = 'flex';
    });
}

function browseHistory() {
    let query = document.querySelector('.search-box').value;
    
    if (query != '') {
        location.search = '?url=' + query;
    }
}

function createYearGraph() {
    let canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        graph = ctx.createImageData(config.graph.width * config.graph.span, config.graph.height);
        dataset = new Array(graph.height).fill(0);
    
    canvas.width  = graph.width;
    canvas.height = graph.height;
    
    for (let capture of captures) {
        dataset[((capture.year - 1996) * 12) + capture.month - 1]++;
    }
    
    let max = Math.max(...dataset),
        slope = (max + config.graph.balance) / max;
    
    for (let y = 0; y < graph.height; y++) {
        let offset = graph.width * 4 * y,
            pow = Math.pow(slope, dataset[y]);
        
        for (let x = 0; x < graph.width; x++) {
            let index = offset + (x * 4);
            
            if (dataset[y] == 0 || x >= ((pow - 1) / pow) * graph.width) {
                for (let c = 0; c < 3; c++) {
                    graph.data[index + c] = 255;
                }
            }
            else {
                graph.data[index + 3] = 255;
            }
        }
    }
    
    ctx.putImageData(graph, 0, 0);
    
    let yearList = document.querySelector('.browse-graph');
    
    Object.assign(yearList.style, {
        width: (config.graph.width * config.graph.xScale) + 'px',
        height: (config.graph.height * config.graph.yScale) + 'px',
        backgroundImage: 'url(' + canvas.toDataURL() + ')',
        backgroundSize: graph.width + 'px 100%'
    });
    
    for (let y = 0; y < common.years; y++) {
        let yearBox = document.createElement('div'),
            yearText = document.createElement('span');
        
        yearBox.className = 'browse-graph-year';
        yearBox.setAttribute('selected', 'false');
        yearBox.addEventListener('click', e => {
            selectYear(Array.from(e.target.parentNode.children).indexOf(e.target));
        });
        yearText.textContent = 1996 + y;
        
        yearBox.append(yearText);
        yearList.append(yearBox);
    }
}

function createMonthGrid() {
    let monthGrid = document.querySelector('.browse-calendar');
        
    for (let m = 0; m < common.months.length; m++) {
        let monthBox = document.createElement('div'),
            monthHeader = document.createElement('div'),
            monthSpacer = document.createElement('div');
        
        monthBox.className = 'browse-calendar-month';
        monthHeader.className = 'browse-calendar-header';
        monthSpacer.className = 'browse-calendar-spacer';
        monthSpacer.style.display = 'none';
        monthHeader.textContent = common.months[m];
        
        monthBox.append(monthHeader, monthSpacer);
        
        for (let d = 0; d < new Date(1996, m + 1, 0).getDate(); d++) {
            let dayBox = document.createElement('div');
            
            dayBox.className = 'browse-calendar-day';
            dayBox.setAttribute('captured', 'false');
            dayBox.textContent = d + 1;
            
            monthBox.append(dayBox);
        }
        
        monthGrid.append(monthBox);
    }
}

function createCaptureList() {
    let captureList = document.querySelector('.browse-captures');
    captureList.style.width = (config.graph.width * config.graph.xScale) + 'px';
    captureList.style.height = (config.graph.height * config.graph.yScale) + 'px';
}

function populateCaptureList(e) {
    let captureList = document.querySelector('.browse-captures'),
        dayBox = e.target;
        dayCaptures = [],
        dayDate = ''
    
    if ((e.type == 'mouseover' && dayBox.getAttribute('captured') == 'false')
     || (e.type == 'mouseout' && document.querySelectorAll('.browse-calendar-day:hover').length == 0)) {
        if (selectedDay == null) {
            captureList.style.visibility = 'hidden';
            return;
        }
        else {
            dayCaptures = selectedDay.getAttribute('indexes').split(',').map(i => captures[i]);
            dayDate = selectedDay.getAttribute('date');
        }
    }
    else if (e.type == 'mouseout') {
        return;
    }
    else {
        dayCaptures = dayBox.getAttribute('indexes').split(',').map(i => captures[i]);
        dayDate = dayBox.getAttribute('date');
    }
    
    let captureHeader = document.querySelector('.browse-captures-header'),
        captureGrid = document.querySelector('.browse-captures-grid');
    
    while (captureGrid.firstChild) {
        captureGrid.removeChild(captureGrid.firstChild);
    }
    
    captureHeader.textContent = (dayCaptures.length).toLocaleString() + ' capture' + (dayCaptures.length == 1 ? '' : 's') + ' on\n' + dayDate;
    
    for (let capture of dayCaptures) {
        let captureBox = document.createElement('a');
        
        try { captureBox.href = 'https://web.archive.org/web/' + capture.date + '/' + capture.url; }
        catch { console.log(dayBox.textContent) }
        captureBox.innerText = capture.time;
        captureBox.style.color = config.captures.initialColor;
        captureBox.style.filter = 'hue-rotate(' + getHue(capture.status) + 'deg)';
        
        captureGrid.append(captureBox);
    }
    
    captureList.style.visibility = 'visible';
}

function selectYear(yearIndex) {
    document.querySelectorAll('.browse-graph-year[selected="true"]').forEach(elem => elem.setAttribute('selected', 'false'));
    document.querySelector('.browse-graph-year:nth-child(' + (yearIndex + 1) + ')').setAttribute('selected', 'true');
    
    let year = 1996 + yearIndex,
        yearCaptures = captures.reduce((a, v, i) => {
        if (v.year == year) {
            a.push({data: v, index: i });
        }
        return a;
    }, []);
    
    document.querySelectorAll('.browse-calendar-month').forEach((monthBox, monthIndex) => {
        let monthSpacer = monthBox.querySelector('.browse-calendar-spacer'),
            monthCaptures = yearCaptures.filter(c => c.data.month == monthIndex + 1),
            weekday = new Date(year, monthIndex, 1).getDay();
        
        if (weekday == 0) {
            monthSpacer.style.display = 'none';
        } else {
            monthSpacer.style.display = 'flex';
            monthSpacer.style.gridColumn = '1 / ' + (weekday + 1);
        }
        
        if (monthIndex == 1) {
            monthSpacer.parentNode.lastChild.style.display = yearIndex % 4 == 0 ? 'flex' : 'none';
        }
        
        monthBox.querySelectorAll('.browse-calendar-day').forEach((dayBox, dayIndex) => {
            let dayCaptures = monthCaptures.filter(c => c.data.day == dayIndex + 1);
            
            dayBox.setAttribute('date', [year, `${monthIndex + 1}`.padStart(2, '0'), `${dayIndex + 1}`.padStart(2, '0')].join('-'));
            dayBox.setAttribute('selected', 'false');
            dayBox.addEventListener('mouseover', populateCaptureList);
            dayBox.addEventListener('mouseout', populateCaptureList);
            dayBox.addEventListener('click', selectDay);
            
            if (dayCaptures.length == 0) {
                dayBox.setAttribute('captured', 'false');
                dayBox.setAttribute('indexes', '');
                dayBox.style.backgroundColor = '#fff';
                dayBox.style.filter = 'none';
                return;
            }
            
            dayBox.setAttribute('captured', 'true');
            
            let hueSum = 0;
            
            for (let capture of dayCaptures) {
                hueSum += getHue(capture.data.status);
            }
            
            dayBox.style.backgroundColor = config.calendar.initialColor;
            dayBox.style.filter = 
                'hue-rotate(' + (hueSum / dayCaptures.length) + 'deg) ' +
                'brightness(' + Math.max(config.calendar.minBright, 1 - (dayCaptures.length * (config.calendar.minBright / config.calendar.threshold))) + ') ' +
                'saturate(' + (Math.max(1, Math.min(config.calendar.maxSaturate, (dayCaptures.length / config.calendar.threshold) * config.calendar.maxSaturate)) | 0) + '00%)';
            dayBox.setAttribute('indexes', dayCaptures.map(c => c.index).join(','));
        });
    });
    
    selectedDay = null;
    document.querySelector('.browse-captures').style.visibility = 'hidden';
}

function selectDay(e) {
    let dayBox = e.target;
    
    if (dayBox.getAttribute('captured') == 'false') {
        return;
    }
    
    if (selectedDay != null) {
        selectedDay.setAttribute('selected', 'false');
    }
    
    dayBox.setAttribute('selected', 'true');
    selectedDay = dayBox;
}

let getHue = statusCode => Math.max(0, 4 - ((statusCode / 100) | 0)) * config.hueIncrement;

document.querySelector('.search-box').addEventListener('keyup', e => { if (e.key == 'Enter') browseHistory(); });
document.querySelector('.search-button').addEventListener('click', browseHistory);