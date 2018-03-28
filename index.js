'use strict';
// commented server side syntax
// import interact from 'interactjs';
/**
 * week dictionary
 */
const weekdays = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat'
]

/**
 * frequently used DOM data
 */
let originElement = null;
let reservedElement = null;
let scrollElement = null;
let dateElement = null;
let currentElement = null;
// scroll synchronizer
let previousScroll = {
  left: null,
  top: null
}
/**
 * other global variables
 */
const timeUnit = 48; //pixels same as in style sheet
const shiftDistance = 306;
let reservedShifted = 0;
let unitInterval = null; // in minutes
let numberOfDays = null;
let firstDay = null;
let lastDay = null;
let timeSlots = []; 
let data = {events: null};
let config = {venues: null};
let numberOfVenues = null;
let numberOfColumns = null;
let megaData = {};
let reservedEvents =  {}
// global variables ends

// call exported buildCalendar and comment this part if mount timing need to be altered.
window.onload= ()=>{
  buildCalendar();
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
        if(unitsX < 0){
          unitsX = 0;
        }
        if(unitsX >= numberOfColumns){
          unitsX = numberOfColumns - 1;
        }
        let snapX = position.left + unitsX * position.width;
        let unitsY = Math.round((y - position.top)/ timeUnit);
        let snapY = position.top + unitsY * timeUnit;
        if(currentElement != null){
          let duration = currentElement.getAttribute('duration');

          if(isOccupied(unitsX, unitsY, duration / 60 / unitInterval)){
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
  // autoScroll: true,
  onstart: interactStart,
  // call this function on every dragmove event
  onmove: dragMoveListener,
  // call this function on every dragend event
  onend: function (event) {
    console.log('end');
    let origin = document.getElementById("originPoint");
    let position = origin.getBoundingClientRect();
    let x = parseFloat(event.target.getAttribute('data-x')) || 0;
    let y = parseFloat(event.target.getAttribute('data-y')) || 0;
    let previousX = event.target.getAttribute('unit-x');
    let previousY = event.target.getAttribute('unit-y');
    let duration = event.target.getAttribute('duration');
    let unitsX = Math.round(x/ position.width);
    let unitsY = Math.round(y/ timeUnit);
    if(previousX == unitsX && previousY == unitsY){
      // snpped back
    } else {
      event.target.setAttribute('unit-x', unitsX);
      event.target.setAttribute('unit-y', unitsY);
      event.target.childNodes[1].innerHTML = compileTimeText(unitsY, duration);
      updateDatabaseCall(currentElement);
    }
    occupy(unitsX, unitsY, duration);
    currentElement = null;
  }
}).resizable({
  // resize from all edges and corners
  edges: { left: false, right: false, bottom: true, top: false },

  // keep the edges inside the parent
  restrictEdges: {
    outer: 'parent',
    endOnly: true,
  },

  snapSize:{
    targets:[
      function (x, y){
        let units = Math.floor((y+1)/timeUnit);
        if( (y+1) % timeUnit > timeUnit * 0.6){
          units += 1;
        }
        if(units < 1){
          units = 1;
        }
        if(currentElement != null){
          let unitsX = currentElement.getAttribute('unit-x');
          let unitsY = currentElement.getAttribute('unit-y');
          // console.log(unitsX, unitsY, units)
          // console.log(timeSlots)
          if(isOccupied(unitsX, unitsY, units)){
            //snap back
            let duration = currentElement.getAttribute('duration');
            units = Math.floor(duration / 60 / unitInterval);
            if( (duration /60 ) % timeUnit > timeUnit * 0.6){
              units += 1;
            }
            if(units < 1){
              units = 1;
            }
          }
        }
        return {y: units * timeUnit - 1 };
      }
    ],
    range: Infinity,
    endOnly: true, // soft snapping
  },
  inertia: true,
  onstart: interactStart,
  onend: function(event){
    console.log('end');
    let height = parseInt(currentElement.style.height);
    let duration = Math.round((height + 1 )/ timeUnit) * unitInterval * 60;
    let prevoiusDuration = event.target.getAttribute('duration');
    let unitsX = event.target.getAttribute('unit-x');
    let unitsY = event.target.getAttribute('unit-y');
    if(duration == prevoiusDuration){
      // snpped back
    } else {
      currentElement.setAttribute('duration', duration);
      event.target.childNodes[1].innerHTML = compileTimeText(unitsY, duration);
      updateDatabaseCall(currentElement);
    }
    occupy(unitsX, unitsY, duration);
    currentElement = null;
  }
}).on('resizemove', function (event) {
  event.target.style.height = event.rect.height + 'px';
}).on('tap', function (event) {
  dispatchInfoEvent(retriveInfo(event.currentTarget));
  event.preventDefault();
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

  }
  previousScroll.left = scrollElement.scrollLeft;
  previousScroll.top = scrollElement.scrollTop;
  dateElement.scrollLeft = scrollElement.scrollLeft;
}

  
function interactStart(event){
  console.log('start');
  currentElement = event.target;
  let unitsX = event.target.getAttribute('unit-x');
  let unitsY = event.target.getAttribute('unit-y');
  let duration = event.target.getAttribute('duration');
  vacate(unitsX, unitsY, duration);
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
    
  // console.log(events);
};

// window.addEventListener('customEventUpdate', (event) =>{
//   console.log(event.detail);
// })

function indexOfVenue(venueID){
  return config.venues.findIndex(venue =>{
    return venue.id == venueID;
  })
}
function createEventNode(event){
  if(lastDay.getTime() <= event.start*1000 || firstDay.getTime() > event.start * 1000){
    // console.log('not in this week', lastDay.getTime(), event.start*1000, firstDay.getTime());
    return false;
  }
  let endTime = new Date(event.start*1000);
  let startingDay = endTime.getDate();
  endTime.setSeconds(endTime.getSeconds() + event.duration - 1);
  let endingDay = endTime.getDate();
  if(startingDay != endingDay){
    console.log('overnight event is not supported',startingDay,endingDay, event);
    return false;
  }
  let newEvent = document.createElement('div');
  newEvent.classList.add('draggable');
  newEvent.classList.add('event');
  let team = document.createElement('span');
  team.innerHTML = event.title;
  team.classList.add('eventText');
  newEvent.appendChild(team);
  let coordinates = timeToCoordinates(new Date(event.start*1000), event.venueID);
  if(isOccupied(coordinates.unitsX, coordinates.unitsY, event.duration / 60 / unitInterval)){
    console.log('target time period is checked');
    return false;
  }

  let timeSpan = document.createElement('span');
  timeSpan.innerHTML = compileTimeText(coordinates.unitsY, event.duration);
  timeSpan.classList.add('eventText')
  newEvent.appendChild(timeSpan);
  
  // console.log(coordinates)
  let height = Math.floor(event.duration * timeUnit / 60 / unitInterval) - 1;
  if(height < 1){
    height = 1;
  }

  let position = originElement.getBoundingClientRect();
  // translate the element
  let x = coordinates.unitsX * position.width;
  let y = coordinates.unitsY * timeUnit;
  newEvent.style.height = height + 'px';
  newEvent.style.webkitTransform =
  newEvent.style.transform =
    'translate(' + x + 'px, ' + y + 'px)';

  // update the posiion attributes
  let eventID = 'event-' + event.id;
  newEvent.setAttribute('data-x', x);
  newEvent.setAttribute('data-y', y);
  
  newEvent.setAttribute('duration', event.duration);
  newEvent.setAttribute('id', eventID);
  newEvent.setAttribute('unit-x', coordinates.unitsX);
  newEvent.setAttribute('unit-y', coordinates.unitsY);
  originElement.appendChild(newEvent);
  megaData[eventID] = event.megaData;
  occupy(coordinates.unitsX, coordinates.unitsY, event.duration);
  return newEvent;
}
/**
 * 
 * @param {*} event target element node
 */
function removeEvent(event){
  let unitsX = event.getAttribute('unit-x');
  let unitsY = event.getAttribute('unit-y');
  let duration = event.getAttribute('duration');
  vacate(unitsX, unitsY, duration);
  return originElement.removeChild(event);
}

function timeToCoordinates(time, venueID){
  let difference = time.getTime() - firstDay.getTime();
  // console.log(venueID, indexOfVenue(venueID))
  let unitsX = Math.floor(difference / (1000*3600*24)) * numberOfVenues + indexOfVenue(venueID);
  let unitsY = Math.floor((difference % (1000*3600*24)) / (1000 * 60 * unitInterval));
  return {unitsX, unitsY}
} 

function compileTimeText(unitsY, duration){
  let additionalMinutes = Math.floor(duration / 60);
  let startHours = muniteToAMPMClock(unitsY * unitInterval);
  let endHours = muniteToAMPMClock(unitsY * unitInterval + additionalMinutes);
  return startHours + ' - ' + endHours;
}

function muniteToAMPMClock(minutes){
  let hour = Math.floor(minutes / 60);
  let minute = ('0' + (minutes % 60)).slice(-2);
  return hour > 12 ? hour == 24 ? `0:${minute}AM` :`${hour - 12}:${minute}PM` : hour == 12 ? `${hour}:${minute}PM`:`${hour}:${minute}AM`;
}

/**
 * @desc requires unitInterval and numberOfColumn
 */
function initializeTimeSlots(){
  for(let i = 0; i < numberOfColumns; i++){
    timeSlots.push(Array(24*60/unitInterval).fill(0));
  }
}

/**
 * @desc requires fisrtDay, originElement, numberOfDays, numberOfVenues
 */
function dyanamicallyInitializeDateColumn(){
  let time = new Date(firstDay);
  let columnContainer = document.getElementById('columnContainer');
  let scrollSpacer = document.getElementById('scrollSpacer');
  let eventArea = originElement.parentNode;
  // console.log('fired',numberOfDays,numberOfVenues);
  for(let i = 0; i < numberOfDays; i++){
    for(let j = 0; j < numberOfVenues; j++){
      let column = document.createElement('div');
      column.classList.add('dateColumn');
      column.classList.add('columnFilling');
      columnContainer.insertBefore(column, scrollSpacer);
      let date = document.createElement('span');
      let day = document.createElement('span');
      let venue = document.createElement('span');
      date.innerHTML = time.getDate();
      date.classList.add('dateText');
      day.innerHTML = weekdays[time.getDay()];
      day.classList.add('dayText');
      venue.innerHTML = config.venues[j].name;
      venue.classList.add('dayText');
      column.appendChild(date);
      column.appendChild(day);
      column.appendChild(venue);

      if(i != 0 || j !=0){
        let eventColumn = document.createElement('div');
        eventColumn.classList.add('timeColumn');
        eventColumn.classList.add('columnFilling');
        eventArea.appendChild(eventColumn);
      }
    }
    time.setDate(time.getDate() + 1);
  }
}

function clearDateColumn(){
  let targets = document.getElementsByClassName('columnFilling');
  // console.log('targets',targets);
  let length = targets.length;
  for(let i =0; i< length; i++){
    targets[0].parentNode.removeChild(targets[0]);
  }
}



function isOccupied(unitsX, unitsY, units){
  // console.log(unitsX, unitsY, units)
  for(let i = unitsY; i < +unitsY + units; i++){
    if(i < timeSlots[unitsX].length){
      // console.log(timeSlots[unitsX][i])
      if(timeSlots[unitsX][i] == 1){
        return true;
      }
    } else {
      return 0;
    }
  }
  return false;
}

function occupy(unitsX, unitsY, duration){
  let numberOfSlots = Math.ceil(duration / 60 / unitInterval);
  // console.log("number of slots",numberOfSlots, unitsY)
  for(let i = unitsY; i < +unitsY + numberOfSlots; i++){
    // console.log(i, +unitsY + numberOfSlots);
    if(i < timeSlots[unitsX].length){
      timeSlots[unitsX][i] = 1;
    }
  }
}

function vacate(unitsX, unitsY, duration){
  let numberOfSlots = Math.ceil(duration / 60 / unitInterval);
  for(let i = +unitsY; i < (+unitsY + numberOfSlots); i++){
    if(i < timeSlots[unitsX].length){
      timeSlots[unitsX][i] = 0;
    }
  }
}

function initializeCalendarBase(){
  let baseElement = document.getElementById('calendarBase');
  baseElement.classList.add('grid');
  let dateScroll = document.createElement('div');
  dateScroll.classList.add('date');
  dateScroll.setAttribute('id', 'dateScroll');
  baseElement.appendChild(dateScroll);
  let timeBase = document.createElement('div');
  timeBase.classList.add('time', 'flexed');
  baseElement.appendChild(timeBase);

  // reserved area
  let reservedArea = document.createElement('div');
  // reservedArea.innerText = 'Reserved Area';
  reservedArea.classList.add('reservedArea');
  reservedArea.classList.add('zeroHeight');
  reservedElement = reservedArea;
  baseElement.appendChild(reservedArea);

  // reserved event
  for(let i = 0; i < 10; i++){
    let reservedEvent = document.createElement('div');
    reservedEvent.classList.add('reservedEvent');
    reservedEvent.innerText = `Resereved Event ${i}`;
    reservedEvent.setAttribute('duration', '7200');
    let eventID = i+100;
    reservedEvent.setAttribute('eventID', eventID);
    
    reservedEvents[eventID] = {
      id: eventID,
      title:'reserved event' + eventID,
      duration:7200,
      megaData:{
        note:'asdfjaskf',
      },
    }
    reservedArea.appendChild(reservedEvent);
  }


  
  let dateHeader = document.createElement('div');
  dateHeader.classList.add('dateHeader');
  dateScroll.appendChild(dateHeader);
  let daysFrame = document.createElement('div');
  daysFrame.classList.add('daysFrame');
  dateScroll.appendChild(daysFrame);

  let button1 = document.createElement('button');
  button1.addEventListener('click', toggleShow);
  button1.innerText = 'On/Off';
  button1.classList.add('controlPenal');
  dateHeader.appendChild(button1);
  let button2 = document.createElement('button');
  button2.addEventListener('click', resetPosition);
  button2.innerText = 'Reset';
  button2.classList.add('controlPenal');
  dateHeader.appendChild(button2);
  let shiftDiv = document.createElement('div');
  shiftDiv.classList.add('controlPenal', 'flexParent');
  let btnLeft = document.createElement('button');
  btnLeft.addEventListener('click', shiftRight);
  btnLeft.innerText = '<';
  btnLeft.classList.add('controlPenal');
  shiftDiv.appendChild(btnLeft);
  let btnRight = document.createElement('button');
  btnRight.addEventListener('click', shiftLeft);
  btnRight.innerText = '>';
  btnRight.classList.add('controlPenal');
  shiftDiv.appendChild(btnRight);
  dateHeader.appendChild(shiftDiv);


  let days = document.createElement('div');
  days.classList.add('days');
  days.setAttribute('id', 'columnContainer');
  daysFrame.appendChild(days);

  let scrollSpacer = document.createElement('div');
  scrollSpacer.classList.add('scrollSpace');
  scrollSpacer.setAttribute('id', 'scrollSpacer');
  days.appendChild(scrollSpacer);


  let eventScroll = document.createElement('div');
  eventScroll.classList.add('timeScroll');
  eventScroll.setAttribute('id', 'eventScroll');
  timeBase.appendChild(eventScroll);

  let timeColumn = document.createElement('div');
  timeColumn.classList.add('timeHeaderCol');
  timeColumn.setAttribute('id', 'timeColumn');
  eventScroll.appendChild(timeColumn);
  let eventArea = document.createElement('div');
  eventArea.classList.add('eventArea', 'flexed');
  eventScroll.appendChild(eventArea);
  
  let timeContainer = document.createElement('div');
  timeContainer.classList.add('timeHeader');
  timeContainer.setAttribute('id', 'timeContainer');
  timeColumn.appendChild(timeContainer);

  let gridContainer = document.createElement('div');
  gridContainer.setAttribute('id', 'gridContainer');
  eventArea.appendChild(gridContainer);
  let originPoint = document.createElement('div');
  originPoint.classList.add('timeColumn');
  originPoint.setAttribute('id', 'originPoint');
  eventArea.appendChild(originPoint);
}
/**
 * @desc requires unitsInterval.
 */
function initializeTimeArea(){
  let gridContainer = document.getElementById('gridContainer');
  let timeContainer = document.getElementById('timeContainer');
  let numberOfUnits = 24 * 60 / unitInterval;
  for(let i = 0; i < numberOfUnits; i++ ){
    let timeUnit = document.createElement('div');
    timeUnit.classList.add('timeUnit');
    let unitBlock = document.createElement('span');
    unitBlock.classList.add('unitBlock');
    unitBlock.innerHTML = muniteToAMPMClock(24*60*i/numberOfUnits);
    timeUnit.appendChild(unitBlock);
    timeContainer.appendChild(timeUnit);

    let gridRow = document.createElement('div');
    gridRow.classList.add('grid-row');
    gridContainer.appendChild(gridRow);
  }
}

function initializeEvents(events){
  for(let i = 0; i< events.length; i++){
    createEventNode(events[i])
  }
}

function initializeReserve(reserves){
  for(let i = 0; i< reserves.length; i++){
    createReserveNode(reserves[i]);
  }
}

function clearChildNodes(element){
  // while(element.firstElementChild){
  //   element.removeChild(element.firstElementChild);
  // }
  while(element.firstChild){
    element.removeChild(element.firstChild);
  }
}
function clearTimeArea(){
  let gridContainer = document.getElementById('gridContainer');
  let timeContainer = document.getElementById('timeContainer');
  clearChildNodes(gridContainer);
  clearChildNodes(timeContainer);
}

function clearEvents(){
  clearChildNodes(originElement);
}

function initializeCalendar(interval, days, initDay, events, venues, reserves = []){
  console.log("Initializing grid and events")
  initializeGlobalVariables(interval, days, initDay, venues);
  initializeTimeArea();
  initializeTimeSlots();
  dyanamicallyInitializeDateColumn();
  initializeEvents(events);
  initializeReserve(reserves);
}

function initializeGlobalVariables(interval, days, initDay, venues){
  unitInterval = interval;
  numberOfDays = days;
  firstDay = new Date(initDay);
  firstDay.setMinutes(firstDay.getMinutes() + firstDay.getTimezoneOffset());
  lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + numberOfDays);

  config.venues = venues;

  numberOfVenues = config.venues.length;
  numberOfColumns = numberOfDays * numberOfVenues;
}

function clearCalendar(){
  console.log("clearing grid and events");
  timeSlots = [];
  megaData = {};
  clearTimeArea();
  clearEvents();
  clearReserves();
  clearDateColumn();
}

function dispatchInfoEvent(payload){
  let event = new CustomEvent("customEventInfo", {detail: payload});
  window.dispatchEvent(event);
}

function dispatchUpdateEvent(payload){
  let event = new CustomEvent("customEventUpdate", {detail: payload});
  window.dispatchEvent(event);
}

function updateDatabaseCall(element, creation = false){
  let payload = retriveInfo(element);
  payload.creation = creation;
  // console.log(payload);
  dispatchUpdateEvent(payload);
}

function retriveInfo(element){
  let unitsX = element.getAttribute('unit-x');
  let unitsY = element.getAttribute('unit-y');
  let duration = element.getAttribute('duration');
  let eventID = element.getAttribute("id");
  let extraData = megaData[eventID];
  eventID = +eventID.slice(6);
  let title = element.firstChild.innerHTML;
  let start = new Date(firstDay);
  let venueIndex = unitsX % numberOfVenues;
  let venueID = config.venues[venueIndex].id;
  start.setDate(start.getDate() + Math.floor(unitsX / numberOfVenues));
  start.setMinutes(start.getMinutes() + unitsY * unitInterval);
  return {start, duration, venueID, eventID, title, megaData:extraData};
}



function createEvent(event){
  let result = createEventNode(event);
  if(result){
    updateDatabaseCall(result, true);
    return true;
  } else {
    return false;
  }
}


function deleteEvent(id){
  let eventID = 'event' + id;
  let event = document.getElementById(eventID);
  removeEvent(event);
}

function updateEventID(oldID, newID){
  let previousID = 'event-' + oldID;
  let targetElement = document.getElementById(previousID);
  targetElement.setAttribute('id','event-'+newID);
}

function updateEventNode(event){
  let eventID = 'event-'+ event.id;
  let targetNode = document.getElementById(eventID);
  removeEvent(targetNode);

  let result = createEventNode(event)
  if(!result){
    recoverEventNode(targetNode);
    return false;
  }
  megaData[eventID] = event.megaData;
  return true;
}

function recoverEventNode(removedEvent){
  console.log('rolling back')
  if(removedEvent==null){
    return false;
  }
  let unitsX = removedEvent.getAttribute('unit-x');
  let unitsY = removedEvent.getAttribute('unit-y');
  let duration = removedEvent.getAttribute('duration');
  occupy(unitsX, unitsY, duration);
  originElement.appendChild(removedEvent);
}

function buildCalendar(){
  initializeCalendarBase();
  console.log('loading frequently used DOM Data')
  originElement = document.getElementById("originPoint");
  dateElement = document.getElementById("dateScroll");
  scrollElement = document.getElementById("eventScroll");
  scrollElement.addEventListener('scroll', scrollListener);
  previousScroll.left = scrollElement.scrollLeft;
  previousScroll.top = scrollElement.scrollTop;
}

// reserved event
// target elements with the "reservedEvent" class
interact('.reservedEvent')
.draggable({
  snap: {
    targets: [
      function(x, y){
        console.log(x,y);
        let position = originElement.getBoundingClientRect();
        let reservedPostion = reservedElement.getBoundingClientRect();
        
        if(y >= position.y && y <= reservedPostion.y){
          let unitsX = Math.round((x - position.left)/ position.width);
          if(unitsX < 0){
            unitsX = 0;
          }
          if(unitsX >= numberOfColumns){
            unitsX = numberOfColumns - 1;
          }
          let snapX = position.left + unitsX * position.width;
          let unitsY = Math.round((y - position.top)/ timeUnit);
          let snapY = position.top + unitsY * timeUnit;
          if(currentElement != null){
            console.log(reservedElement.getBoundingClientRect());
            let duration = currentElement.getAttribute('duration');
            let eventID = currentElement.getAttribute('eventID');
            let occupationCheck = isOccupied(unitsX, unitsY, duration / 60 / unitInterval);
            // console.log(occupationCheck, occupationCheck == false, occupationCheck === 0)
            if(occupationCheck || occupationCheck === 0){
              // do nothing
              // console.log('occupied');
              
            } else {
              // record attributes to create
              // console.log('fired');
              reserveToActive(unitsX, unitsY, eventID);
              
            }
          }
        }
        return {x: 0, y:0};
      }
    ],
    range: Infinity,
    endOnly: true, // soft snapping
    relativePoints: [ { x: 0, y: 0 } ]
  },
  onstart: (event)=>{
    currentElement = event.target;
  },
  // call this function on every dragmove event
  onmove: dragMoveListener,
  // call this function on every dragend event
  onend: function (event) {
    event.target.style.webkitTransform =
    event.target.style.transform =
      'translate(' + 0 + 'px, ' + 0 + 'px)';
    event.target.removeAttribute('data-x');
    event.target.removeAttribute('data-y');
    currentElement = null;
    console.log('still fired')
  }
});

function createEventObject(unitsX, unitsY, reservedEventID){
  let start = new Date(firstDay);
  let venueIndex = unitsX % numberOfVenues;
  let venueID = config.venues[venueIndex].id;
  start.setDate(start.getDate() + Math.floor(unitsX / numberOfVenues));
  start.setMinutes(start.getMinutes() + unitsY * unitInterval);
  reservedEvents[reservedEventID].venueID = venueID;
  reservedEvents[reservedEventID].start = Math.floor(start.getTime()/1000);
  return reservedEvents[reservedEventID];
}

function reserveToActive(unitsX, unitsY, eventID){
  let newNode = createEventNode(createEventObject(unitsX, unitsY, eventID))
  if(newNode){
    updateDatabaseCall(newNode)
    currentElement.parentNode.removeChild(currentElement);
    delete reservedEvents[eventID];
  }
}

function activeToReserved(id){
  let target = document.getElementById('event-'+id);
  let info = retriveInfo(target);
  let event = {
    id: info.eventID,
    title: info.title, 
    duration: info.duration, 
    megaData: info.megaData,
  };
  console.log(info, event);
  createReserveNode(event);
  removeEvent(target);
}
const testReserveEvent = {
  id: 111,
  title:'test reserved event 101',
  duration:7200,
  megaData:{
    note:'asdfjaskf',
  },
}

function createReserveNode(event){
  let reservedEvent = document.createElement('div');
  reservedEvent.classList.add('reservedEvent');
  reservedEvent.innerText = `Resereved Event ${event.title}`;
  reservedEvent.setAttribute('duration', event);
  reservedEvent.setAttribute('eventID', event.id);
  
  reservedEvents[event.id] = event;
  reservedElement.appendChild(reservedEvent);
}

function clearReserves(){
  clearChildNodes(reservedElement);
}

function shiftLeft(){
  reservedShifted += shiftDistance;
  reservedElement.style.webkitTransform =
    reservedElement.style.transform =
    'translate(-' + reservedShifted + 'px)';
}

function shiftRight(){
  reservedShifted -= shiftDistance;
  if(reservedShifted < 0){
    reservedShifted = 0;
  }
  reservedElement.style.webkitTransform =
    reservedElement.style.transform =
    'translate(-' + reservedShifted + 'px)';
}

function resetPosition(){
  reservedShifted = 0;
  reservedElement.style.webkitTransform =
    reservedElement.style.transform =
    'translate(-' + reservedShifted + 'px)';
}

function toggleShow(event){
  console.log(event.target)
  reservedElement.classList.toggle('zeroHeight')
}

// export this
function reloadReserve(newReserves){
  clearReserves();
  initializeReserve(newReserves);
}

// commented since it's server side module syntax
// export {
//   buildCalendar,
//   initializeCalendar,
//   clearCalendar,
//   createEvent,
//   deleteEvent,
//   updateEventID,
//   updateEventNode,
//   reloadReserve,
// };


// local test data
document.addEventListener('keypress', (event) => {
  if(event.code == 'Digit0'){
    updateEventNode({
      id:1,
      title:"event 1",
      start:1519653600,// 26 9am
      duration:36000,
      venueID:11,
      megaData:{
        note:'new megaData',
      },
    },)
  }
  if(event.code == 'Digit9'){
    recoverEventNode(removeEvent(document.getElementById('event-1')));
  }
  if(event.code == 'Digit8'){
    let events = [
      {
        id:1,
        title:"event 1",
        start:1519653600,// 26 9am
        duration:3600,
        venueID:11,
        megaData:{
          note:'asdfjaskf',
        },
      },
      {
        id:2,
        title:"event 2", 
        start:1519729200,// 27 6am
        duration:5400,
        venueID:11,
        megaData:{
          note:'asdfjaskf',
        },
      },
      {
        id:3,
        title:"event 3",
        start:1519567200,// 25 9am
        duration:3600,
        venueID:22,
        megaData:{
          note:'asdfjaskf',
        },
      },
      {
        id:4,
        title:"event 4 with a super long name abcdabcdabcdabcd",
        start:1519736400,// 27 7am
        duration:3600,
        venueID:11,
        megaData:{
          note:'asdfjaskf',
        },
      },
      {
        id:5,
        title:"event 5",
        start:1519880700,// 1 0:05am
        duration:360000,
        venueID:11,
        megaData:{
          note:'asdfjaskf',
        },
      }
    ];

    let venues = [
      {
        id:11,
        name:"venue 1",
      },
      {
        id:22,
        name:"venue 2",
      },
      // {
      //   id:3,
      //   name:"venue 3",
      // },
      // {
      //   id:4,
      //   name:"venue 4",
      // },
      // {
      //   id:5,
      //   name:"venue 5",
      // },
      // {
      //   id:6,
      //   name:"venue 6",
      // },
      // {
      //   id:7,
      //   name:"venue 7",
      // },
      // {
      //   id:8,
      //   name:"venue 8",
      // },
      // {
      //   id:9,
      //   name:"venue 9",
      // },
      // {
      //   id:10,
      //   name:"venue 10",
      // },
    ];

    let reserves = [
      {
        id: 111,
        title:'test reserved event 111',
        duration:7200,
        megaData:{
          note:'asdfjaskf',
        },
      },
      {
        id: 112,
        title:'test reserved event 112',
        duration:7200,
        megaData:{
          note:'asdfjaskf',
        },
      },{
        id: 113,
        title:'test reserved event 113',
        duration:7200,
        megaData:{
          note:'asdfjaskf',
        },
      },{
        id: 114,
        title:'test reserved event 114',
        duration:7200,
        megaData:{
          note:'asdfjaskf',
        },
      },{
        id: 115,
        title:'test reserved event 115',
        duration:7200,
        megaData:{
          note:'asdfjaskf',
        },
      },{
        id: 116,
        title:'test reserved event 116',
        duration:7200,
        megaData:{
          note:'asdfjaskf',
        },
      },{
        id: 117,
        title:'test reserved event 117',
        duration:7200,
        megaData:{
          note:'asdfjaskf',
        },
      },{
        id: 118,
        title:'test reserved event 118',
        duration:7200,
        megaData:{
          note:'asdfjaskf',
        },
      },{
        id: 119,
        title:'test reserved event 119',
        duration:7200,
        megaData:{
          note:'asdfjaskf',
        },
      },{
        id: 120,
        title:'test reserved event 120',
        duration:7200,
        megaData:{
          note:'asdfjaskf',
        },
      },
    ]

    initializeCalendar(60, 7, '2018-02-25', events, venues, reserves);
  }
  if(event.code == 'Digit7'){
    clearCalendar();
  }
  if(event.code == 'Digit6'){
    createReserveNode(testReserveEvent);
  }
  if(event.code == 'Digit5'){
    activeToReserved(3);
  }
  if(event.code == 'Digit4'){
    toggleShow();
  }
  if(event.code == 'Digit1'){
    shiftLeft();
  }
  if(event.code == 'Digit2'){
    shiftRight();
  }
  if(event.code == 'Digit3'){
    resetPosition();
  }
});