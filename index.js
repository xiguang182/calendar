const timeUnit = 48;// 3600, 4px = 300 sec
const unitInMinute = 48 * 60 / timeUnit; 
let originElement = null;
let scrollElement = null;
let dateElement = null;
let currentElement = null;
let previousScroll = {
  left: null,
  top: null
}
let timeSlots = []; 
const firstDay = new Date(1519621200000); //Feb26th
const lastDay = new Date(firstDay);
lastDay.setDate(firstDay.getDate() + 7);
const weekdays = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat'
]

let data = {
  events: [
    {
      id:1,
      title:"event 1",
      start:1519653600,// 26 9am
      duration:3600,
    },
    {
      id:2,
      title:"event 2", 
      start:1519729200,// 27 6am
      duration:5400,
    },
    {
      id:3,
      title:"event 3",
      start:1519567200,// 25 9am
      duration:3600,
    },
    {
      id:4,
      title:"event 4 with a super long name abcdabcdabcdabcd",
      start:1519736400,// 27 7am
      duration:3600,
    }
  ]
}


window.onload= ()=>{
  console.log('loading')
  originElement = document.getElementById("originPoint");
  dateElement = document.getElementById("dateScroll");
  scrollElement = document.getElementById("eventScroll");
  scrollElement.addEventListener('scroll', scrollListener);
  previousScroll.left = scrollElement.scrollLeft;
  previousScroll.top = scrollElement.scrollTop;
  console.log(data);
  initializeTimeSlots();
  initializeDateColumn();
  for(let i = 0; i< data.events.length; i++){
    createEventNode(data.events[i])
  }
}
// target elements with the "draggable" class
interact('.draggable')
  .draggable({
    snap: {
      targets: [
        function (x, y) {
          let origin = document.getElementById("originPoint");
          let position = origin.getBoundingClientRect();
          let unitsX = Math.round((x - position.left)/ position.width);
          let snapX = position.left + unitsX * position.width;
          let unitsY = Math.round((y - position.top)/ timeUnit);
          let snapY = position.top + unitsY * timeUnit;
          if(currentElement != null){
            let duration = currentElement.getAttribute('duration');
            if(isOccupied(unitsX, unitsY, duration)){
              //snap back
              let startUnitsX = currentElement.getAttribute('unit-x') || 0;
              let startUnitsY = currentElement.getAttribute('unit-y') || 0;
              snapX = position.left + startUnitsX * position.width;
              snapY = position.top + startUnitsY * timeUnit;
            }
          }
          return {x: snapX, y: snapY, range: Infinity}
        },
      ],
      range: Infinity,
      endOnly: true, // soft snapping
      relativePoints: [ { x: 0, y: 0 } ]
    },
    // enable inertial throwing
    inertia: true,
    // keep the element within the area of it's parent
    restrict: {
      restriction: ".eventArea",
      endOnly: true,
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    },
    // enable autoScroll
    autoScroll: true,
    onstart:function(event){
      console.log('start');
      currentElement = event.target;
      let unitsX = event.target.getAttribute('unit-x');
      let unitsY = event.target.getAttribute('unit-y');
      let duration = event.target.getAttribute('duration');
      vacate(unitsX, unitsY, duration);

    },
    // call this function on every dragmove event
    onmove: dragMoveListener,
    // call this function on every dragend event
    onend: function (event) {
      console.log('end')
      let origin = document.getElementById("originPoint");
      let position = origin.getBoundingClientRect();
      let x = parseFloat(event.target.getAttribute('data-x')) || 0;
      let y = parseFloat(event.target.getAttribute('data-y')) || 0;
      let previousX = event.target.getAttribute('unit-x');
      let previousY = event.target.getAttribute('unit-y');
      let duration = event.target.getAttribute('duration');
      unitsX = Math.round(x/ position.width);
      unitsY = Math.round(y/ timeUnit);
      if(previousX == unitsX && previousY == unitsY){
        // snpped back
      } else {
        event.target.setAttribute('unit-x', unitsX);
        event.target.setAttribute('unit-y', unitsY);
        event.target.childNodes[1].innerHTML = compileTimeText(unitsY, duration);
      }
      occupy(unitsX, unitsY, duration);
      currentElement = null;
    }
  });

  function scrollListener(event){
    if(currentElement == null){
      
      // console.log("scrolled", scrollElement.scrollTop, scrollElement.scrollLeft);
    } else {
      // console.log("scrolled");
      let target = currentElement,
        // keep the dragged position in the data-x/data-y attributes
        x = (parseFloat(target.getAttribute('data-x')) || 0) + scrollElement.scrollLeft - previousScroll.left,
        y = (parseFloat(target.getAttribute('data-y')) || 0) + scrollElement.scrollTop - previousScroll.top;

      // translate the element
      target.style.webkitTransform =
      target.style.transform =
        'translate(' + x + 'px, ' + y + 'px)';

      // update the posiion attributes
      target.setAttribute('data-x', x);
      target.setAttribute('data-y', y);

      previousScroll.left = scrollElement.scrollLeft;
      previousScroll.top = scrollElement.scrollTop;
    }
    dateElement.scrollLeft = scrollElement.scrollLeft;
  }

  // window.addEventListener("scroll", scrollListener);

  function dragMoveListener (event) {
    let target = event.target,
        // keep the dragged position in the data-x/data-y attributes
        x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        // console.log(event.dx,event.dy);

    // translate the element
    target.style.webkitTransform =
    target.style.transform =
      'translate(' + x + 'px, ' + y + 'px)';

    // update the posiion attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
  }

  // this is used later in the resizing and gesture demos
  window.dragMoveListener = dragMoveListener;

interact('.timeColumn').dropzone({
  // only accept elements matching this CSS selector
  accept: '.draggable',
  // Require a 51% element overlap for a drop to be possible
  overlap: 0.51,

  // listen for drop related events:

  ondropactivate: function (event) {
    // add active dropzone feedback
    event.target.classList.add('drop-active');
  },
  ondragenter: function (event) {
    var draggableElement = event.relatedTarget,
        dropzoneElement = event.target;

    // feedback the possibility of a drop
    dropzoneElement.classList.add('drop-target');
    // draggableElement.textContent = 'Dragged in';
  },
  ondragleave: function (event) {
    // remove the drop feedback style
    event.target.classList.remove('drop-target');
    // event.relatedTarget.textContent = 'Dragged out';
  },
  ondrop: function (event) {
    // event.target.appendChild(event.relatedTarget)
    // event.relatedTarget.textContent = 'Dropped';
  },
  ondropdeactivate: function (event) {
    // remove active dropzone feedback
    event.target.classList.remove('drop-target');
  }
});

window.onresize = function(event) {
  let events = document.getElementsByClassName("event");
  let origin = document.getElementById("originPoint");
  let position = origin.getBoundingClientRect();
  // console.log(events)
  for(let i = 0; i< events.length; i++){
    let unitsX = events[i].getAttribute('unit-x') || 0;
    if(unitsX == 0){
      continue;
    }
    let y = parseFloat(events[i].getAttribute('data-y'));
    let x = unitsX * position.width;

    // translate the element
    events[i].style.webkitTransform =
    events[i].style.transform =
      'translate(' + x + 'px, ' + y + 'px)';

    // update the posiion attributes
    events[i].setAttribute('data-x', x);
    events[i].setAttribute('data-y', y);
  }
    
  console.log(events);
};


document.addEventListener('keypress', (event) => {
  if(event.code == 'Digit0'){
    createEventNode(data.events[0]);
  }
  if(event.code == 'Digit9'){
    removeEvent(document.getElementById('1'));
  }
});

function createEventNode(event){
  if(lastDay.getTime() <= event.start*1000 || firstDay.getTime() > event.start * 1000){
    console.log('not in this week', lastDay.getTime(), event.start*1000, firstDay.getTime());
    return;
  }
  let newEvent = document.createElement('div');
  newEvent.classList.add('draggable');
  newEvent.classList.add('event');
  let team = document.createElement('span');
  team.innerHTML = event.title;
  team.classList.add('eventText');
  newEvent.appendChild(team);
  let coordinates = timeToCoordinates(new Date(event.start*1000));
  if(isOccupied(coordinates.unitsX, coordinates.unitsY, event.duration)){
    alert('targey time period is checked');
    return;
  }

  let timeSpan = document.createElement('span');
  timeSpan.innerHTML = compileTimeText(coordinates.unitsY, event.duration);
  timeSpan.classList.add('eventText')
  newEvent.appendChild(timeSpan);
  
  // console.log(coordinates)
  let height = Math.floor(event.duration / 300) * 4 - 1;
  let position = originElement.getBoundingClientRect();
  // translate the element
  let x = coordinates.unitsX * position.width;
  let y = coordinates.unitsY * timeUnit;
  newEvent.style.height = height + 'px';
  newEvent.style.webkitTransform =
  newEvent.style.transform =
    'translate(' + x + 'px, ' + y + 'px)';

  // update the posiion attributes
  newEvent.setAttribute('data-x', x);
  newEvent.setAttribute('data-y', y);
  
  newEvent.setAttribute('duration', event.duration);
  newEvent.setAttribute('id', event.id);
  newEvent.setAttribute('unit-x', coordinates.unitsX);
  newEvent.setAttribute('unit-y', coordinates.unitsY);
  originElement.appendChild(newEvent);
  occupy(coordinates.unitsX, coordinates.unitsY, event.duration);
  return newEvent;
}

function removeEvent(event){
  let unitsX = event.getAttribute('unit-x');
  let unitsY = event.getAttribute('unit-y');
  let duration = event.getAttribute('duration');
  vacate(unitsX, unitsY, duration);
  originElement.removeChild(event);
}

function timeToCoordinates(time){
  let difference = time.getTime() - firstDay.getTime();
  unitsX = Math.floor(difference / (1000*3600*24));
  unitsY = Math.floor((difference % (1000*3600*24)) / (1000 * 60 * unitInMinute));
  return {unitsX, unitsY}
} 

function compileTimeText(unitsY, duration){
  let additionalMinutes = Math.floor(duration / 60);
  let startMinutes = ('0' + (unitsY * unitInMinute % 60)).slice(-2);
  let startHours = Math.floor(unitsY * unitInMinute / 60);
  startHours = startHours > 12 ? `${startHours - 12}: ${startMinutes} PM` : startHours == 12 ? `${startHours}:${startMinutes} PM` : `${startHours}:${startMinutes} AM`;
  
  let endMinutes = ('0' + (unitsY * unitInMinute + additionalMinutes) % 60).slice(-2);
  let endHours = Math.floor((unitsY * unitInMinute + additionalMinutes) / 60);
  endHours = endHours > 12 ? `${endHours - 12}: ${endMinutes} PM` : endHours == 12 ? `${endHours}:${endMinutes} PM` : `${endHours}:${endMinutes} AM`;
  return startHours + ' - ' + endHours;
}

function initializeTimeSlots(){
  for(let i = 0; i < 7; i++){
    timeSlots.push(Array(24*60/unitInMinute).fill(0));
  }
}

function initializeDateColumn(){
  let dateColumns = document.getElementsByClassName('dateColumn');
  let length = dateColumns.length;
  let time = new Date(firstDay);
  for(let i = 0; i < length; i++){
    let date = document.createElement('span');
    let day = document.createElement('span');
    date.innerHTML = time.getDate();
    date.classList.add('dateText');
    day.innerHTML = weekdays[time.getDay()];
    day.classList.add('dayText');
    dateColumns[i].appendChild(date);
    dateColumns[i].appendChild(day);
    time.setDate(time.getDate() + 1);
  }
}

function isOccupied(unitsX, unitsY, duration){
  let numberOfSlots = Math.ceil(duration / 60 / unitInMinute);
  for(let i = unitsY; i < unitsY + numberOfSlots; i++){
    if(i < timeSlots[unitsX].length){
      if(timeSlots[unitsX][i] == 1){
        return true;
      }
    }
  }
  return false;
}

function occupy(unitsX, unitsY, duration){
  let numberOfSlots = Math.ceil(duration / 60 / unitInMinute);
  for(let i = unitsY; i < unitsY + numberOfSlots; i++){
    if(i < timeSlots[unitsX].length){
      timeSlots[unitsX][i] = 1;
    }
  }
}

function vacate(unitsX, unitsY, duration){
  let numberOfSlots = Math.ceil(duration / 60 / unitInMinute);
  for(let i = +unitsY; i < (+unitsY + numberOfSlots); i++){
    if(i < timeSlots[unitsX].length){
      timeSlots[unitsX][i] = 0;
    }
  }
}

function updateDatabase(){
  console.log('update database');
}