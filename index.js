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
  'Sat',
];

/**
 * frequently used DOM data
 */
let originElement = null;
let reservedElement = null;
let scrollElement = null;
let dateElement = null;
let currentElement = null;
// scroll synchronizer
const previousScroll = {
  left: null,
  top: null,
};
/**
 * other global variables
 */
const timeUnit = 48; // pixels same as in style sheet
const shiftDistance = 306;
let reservedShifted = 0;
let unitInterval = null; // in minutes
let numberOfDays = null;
let firstDay = null;
let lastDay = null;
let timeSlots = [];
const config = { venues: null };
let numberOfVenues = null;
let numberOfColumns = null;
let megaData = {};
const reservedEvents = {};
// global variables ends


function scrollListener(event) {
  if (currentElement == null) {

    // console.log("scrolled", scrollElement.scrollTop, scrollElement.scrollLeft);
  } else {
    // console.log("scrolled");
    const target = currentElement;
    // keep the dragged position in the data-x/data-y attributes
    const x = (parseFloat(target.getAttribute('data-x')) || 0) + (scrollElement.scrollLeft - previousScroll.left);
    const y = (parseFloat(target.getAttribute('data-y')) || 0) + (scrollElement.scrollTop - previousScroll.top);

    // translate the element
    target.style.webkitTransform = `translate(${x}px, ${y}px)`;
    target.style.transform = `translate(${x}px, ${y}px)`;


    // update the posiion attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
  }
  previousScroll.left = scrollElement.scrollLeft;
  previousScroll.top = scrollElement.scrollTop;
  dateElement.scrollLeft = scrollElement.scrollLeft;
}


// window.addEventListener("scroll", scrollListener);

function dragMoveListener(event) {
  const { target } = event;
  // keep the dragged position in the data-x/data-y attributes
  const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
  const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
  // console.log(event.dx,event.dy);

  // translate the element
  target.style.webkitTransform = `translate(${x}px, ${y}px)`;
  target.style.transform = `translate(${x}px, ${y}px)`;


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

  ondropactivate(event) {
    // add active dropzone feedback
    event.target.classList.add('drop-active');
  },
  ondragenter(event) {
    const dropzoneElement = event.target;

    // feedback the possibility of a drop
    dropzoneElement.classList.add('drop-target');
    // draggableElement.textContent = 'Dragged in';
  },
  ondragleave(event) {
    // remove the drop feedback style
    event.target.classList.remove('drop-target');
    // event.relatedTarget.textContent = 'Dragged out';
  },
  ondrop(event) {
    // event.target.appendChild(event.relatedTarget)
    // event.relatedTarget.textContent = 'Dropped';
  },
  ondropdeactivate(event) {
    // remove active dropzone feedback
    event.target.classList.remove('drop-target');
  },
});

window.onresize = (event) => {
  const events = document.getElementsByClassName('event');
  const origin = document.getElementById('originPoint');
  const position = origin.getBoundingClientRect();
  // console.log(events)
  for (let i = 0; i < events.length; i += 1) {
    const unitsX = events[i].getAttribute('unit-x') || 0;
    if (unitsX !== 0) {
      const y = parseFloat(events[i].getAttribute('data-y'));
      const x = unitsX * position.width;

      // translate the element
      events[i].style.webkitTransform = `translate(${x}px, ${y}px)`;
      events[i].style.transform = `translate(${x}px, ${y}px)`;


      // update the posiion attributes
      events[i].setAttribute('data-x', x);
      events[i].setAttribute('data-y', y);
    }
  }

  // console.log(events);
};

// window.addEventListener('customEventUpdate', (event) =>{
//   console.log(event.detail);
// })

function indexOfVenue(venueID) {
  return config.venues.findIndex(venue => venue.id === venueID);
}

function timeToCoordinates(time, venueID) {
  const difference = time.getTime() - firstDay.getTime();
  // console.log(venueID, indexOfVenue(venueID))
  const unitsX = (Math.floor(difference / (1000 * 3600 * 24)) * numberOfVenues) + indexOfVenue(venueID);
  const unitsY = Math.floor((difference % (1000 * 3600 * 24)) / (1000 * 60 * unitInterval));
  return { unitsX, unitsY };
}

function isOccupied(unitsX, unitsY, units) {
  // console.log(unitsX, unitsY, units)
  for (let i = unitsY; i < +unitsY + units; i += 1) {
    if (i < timeSlots[unitsX].length) {
      // console.log(timeSlots[unitsX][i])
      if (timeSlots[unitsX][i] === 1) {
        return true;
      }
    } else {
      return 0;
    }
  }
  return false;
}

function occupy(unitsX, unitsY, duration) {
  const numberOfSlots = Math.ceil(duration / 60 / unitInterval);
  // console.log("number of slots",numberOfSlots, unitsY)
  for (let i = unitsY; i < +unitsY + numberOfSlots; i += 1) {
    // console.log(i, +unitsY + numberOfSlots);
    if (i < timeSlots[unitsX].length) {
      timeSlots[unitsX][i] = 1;
    }
  }
}

function vacate(unitsX, unitsY, duration) {
  const numberOfSlots = Math.ceil(duration / 60 / unitInterval);
  for (let i = +unitsY; i < (+unitsY + numberOfSlots); i += 1) {
    if (i < timeSlots[unitsX].length) {
      timeSlots[unitsX][i] = 0;
    }
  }
}

function muniteToAMPMClock(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = (`0${minutes % 60}`).slice(-2);
  let str;
  if (hour > 12) {
    if (hour === 24) {
      str = `0:${minute}AM`;
    } else {
      str = `${hour - 12}:${minute}PM`;
    }
  } else if (hour === 12) {
    str = `12:${minute}PM`;
  } else {
    str = `${hour}:${minute}AM`;
  }
  return str;
  // return hour > 12 ? hour == 24 ? `0:${minute}AM` : `${hour - 12}:${minute}PM` : hour == 12 ? `${hour}:${minute}PM` : `${hour}:${minute}AM`;
}

function compileTimeText(unitsY, duration) {
  const additionalMinutes = Math.floor(duration / 60);
  const startHours = muniteToAMPMClock(unitsY * unitInterval);
  const endHours = muniteToAMPMClock((unitsY * unitInterval) + additionalMinutes);
  return `${startHours} - ${endHours}`;
}

function clearChildNodes(element) {
  // while(element.firstElementChild){
  //   element.removeChild(element.firstElementChild);
  // }
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function clearReserves() {
  clearChildNodes(reservedElement);
}

function shiftLeft() {
  reservedShifted += shiftDistance;
  reservedElement.style.webkitTransform = `translate(-${reservedShifted}px)`;
  reservedElement.style.transform = `translate(-${reservedShifted}px)`;
}

function shiftRight() {
  reservedShifted -= shiftDistance;
  if (reservedShifted < 0) {
    reservedShifted = 0;
  }
  reservedElement.style.webkitTransform = `translate(-${reservedShifted}px)`;
  reservedElement.style.transform = `translate(-${reservedShifted}px)`;
}

function resetPosition() {
  reservedShifted = 0;
  reservedElement.style.webkitTransform = `translate(-${reservedShifted}px)`;
  reservedElement.style.transform = `translate(-${reservedShifted}px)`;
}

function toggleShow(event) {
  // console.log(event.target);
  reservedElement.classList.toggle('zeroHeight');
}

function createReserveNode(event) {
  const reservedEvent = document.createElement('div');
  reservedEvent.classList.add('reservedEvent');
  reservedEvent.innerText = `Resereved Event ${event.title}`;
  reservedEvent.setAttribute('duration', event);
  reservedEvent.setAttribute('eventID', event.id);

  reservedEvents[event.id] = event;
  reservedElement.appendChild(reservedEvent);
}

function createEventNode(event) {
  if (lastDay.getTime() <= event.start * 1000 || firstDay.getTime() > event.start * 1000) {
    // console.log('not in this week', lastDay.getTime(), event.start*1000, firstDay.getTime());
    return false;
  }
  const endTime = new Date(event.start * 1000);
  const startingDay = endTime.getDate();
  endTime.setSeconds(endTime.getSeconds() + (event.duration - 1));
  const endingDay = endTime.getDate();
  if (startingDay !== endingDay) {
    console.log('overnight event is not supported', startingDay, endingDay, event);
    return false;
  }
  const newEvent = document.createElement('div');
  newEvent.classList.add('draggable');
  newEvent.classList.add('event');
  const team = document.createElement('span');
  team.innerHTML = event.title;
  team.classList.add('eventText');
  newEvent.appendChild(team);
  const coordinates = timeToCoordinates(new Date(event.start * 1000), event.venueID);
  if (isOccupied(coordinates.unitsX, coordinates.unitsY, event.duration / 60 / unitInterval)) {
    console.log('target time period is checked');
    return false;
  }

  const timeSpan = document.createElement('span');
  timeSpan.innerHTML = compileTimeText(coordinates.unitsY, event.duration);
  timeSpan.classList.add('eventText');
  newEvent.appendChild(timeSpan);

  // console.log(coordinates)
  let height = Math.floor((event.duration * timeUnit) / 60 / unitInterval) - 1;
  if (height < 1) {
    height = 1;
  }

  const position = originElement.getBoundingClientRect();
  // translate the element
  const x = coordinates.unitsX * position.width;
  const y = coordinates.unitsY * timeUnit;
  newEvent.style.height = `${height}px`;
  newEvent.style.webkitTransform = `translate(${x}px, ${y}px)`;
  newEvent.style.transform = `translate(${x}px, ${y}px)`;


  // update the posiion attributes
  const eventID = `event-${event.id}`;
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
function removeEvent(event) {
  const unitsX = event.getAttribute('unit-x');
  const unitsY = event.getAttribute('unit-y');
  const duration = event.getAttribute('duration');
  vacate(unitsX, unitsY, duration);
  return originElement.removeChild(event);
}


/**
 * @desc requires unitInterval and numberOfColumn
 */
function initializeTimeSlots() {
  for (let i = 0; i < numberOfColumns; i += 1) {
    timeSlots.push(Array((24 * 60) / unitInterval).fill(0));
  }
}

/**
 * @desc requires fisrtDay, originElement, numberOfDays, numberOfVenues
 */
function dyanamicallyInitializeDateColumn() {
  const time = new Date(firstDay);
  const columnContainer = document.getElementById('columnContainer');
  const scrollSpacer = document.getElementById('scrollSpacer');
  const eventArea = originElement.parentNode;
  // console.log('fired',numberOfDays,numberOfVenues);
  for (let i = 0; i < numberOfDays; i += 1) {
    for (let j = 0; j < numberOfVenues; j += 1) {
      const column = document.createElement('div');
      column.classList.add('dateColumn');
      column.classList.add('columnFilling');
      columnContainer.insertBefore(column, scrollSpacer);
      const date = document.createElement('span');
      const day = document.createElement('span');
      const venue = document.createElement('span');
      date.innerHTML = time.getDate();
      date.classList.add('dateText');
      day.innerHTML = weekdays[time.getDay()];
      day.classList.add('dayText');
      venue.innerHTML = config.venues[j].name;
      venue.classList.add('dayText');
      column.appendChild(date);
      column.appendChild(day);
      column.appendChild(venue);

      if (i !== 0 || j !== 0) {
        const eventColumn = document.createElement('div');
        eventColumn.classList.add('timeColumn');
        eventColumn.classList.add('columnFilling');
        eventArea.appendChild(eventColumn);
      }
    }
    time.setDate(time.getDate() + 1);
  }
}

function clearDateColumn() {
  const targets = document.getElementsByClassName('columnFilling');
  // console.log('targets',targets);
  const { length } = targets;
  for (let i = 0; i < length; i += 1) {
    targets[0].parentNode.removeChild(targets[0]);
  }
}


function initializeCalendarBase() {
  const baseElement = document.getElementById('calendarBase');
  baseElement.classList.add('grid');
  const dateScroll = document.createElement('div');
  dateScroll.classList.add('date');
  dateScroll.setAttribute('id', 'dateScroll');
  baseElement.appendChild(dateScroll);
  const timeBase = document.createElement('div');
  timeBase.classList.add('time', 'flexed');
  baseElement.appendChild(timeBase);

  // reserved area
  const reservedArea = document.createElement('div');
  // reservedArea.innerText = 'Reserved Area';
  reservedArea.classList.add('reservedArea');
  reservedArea.classList.add('zeroHeight');
  reservedElement = reservedArea;
  baseElement.appendChild(reservedArea);

  // reserved event
  for (let i = 0; i < 10; i += 1) {
    const reservedEvent = document.createElement('div');
    reservedEvent.classList.add('reservedEvent');
    reservedEvent.innerText = `Resereved Event ${i}`;
    reservedEvent.setAttribute('duration', '7200');
    const eventID = i + 100;
    reservedEvent.setAttribute('eventID', eventID);

    reservedEvents[eventID] = {
      id: eventID,
      title: `reserved event${eventID}`,
      duration: 7200,
      megaData: {
        note: 'asdfjaskf',
      },
    };
    reservedArea.appendChild(reservedEvent);
  }


  const dateHeader = document.createElement('div');
  dateHeader.classList.add('dateHeader');
  dateScroll.appendChild(dateHeader);
  const daysFrame = document.createElement('div');
  daysFrame.classList.add('daysFrame');
  dateScroll.appendChild(daysFrame);

  const button1 = document.createElement('button');
  button1.addEventListener('click', toggleShow);
  button1.innerText = 'On/Off';
  button1.classList.add('controlPenal');
  dateHeader.appendChild(button1);
  const button2 = document.createElement('button');
  button2.addEventListener('click', resetPosition);
  button2.innerText = 'Reset';
  button2.classList.add('controlPenal');
  dateHeader.appendChild(button2);
  const shiftDiv = document.createElement('div');
  shiftDiv.classList.add('controlPenal', 'flexParent');
  const btnLeft = document.createElement('button');
  btnLeft.addEventListener('click', shiftRight);
  btnLeft.innerText = '<';
  btnLeft.classList.add('controlPenal');
  shiftDiv.appendChild(btnLeft);
  const btnRight = document.createElement('button');
  btnRight.addEventListener('click', shiftLeft);
  btnRight.innerText = '>';
  btnRight.classList.add('controlPenal');
  shiftDiv.appendChild(btnRight);
  dateHeader.appendChild(shiftDiv);


  const days = document.createElement('div');
  days.classList.add('days');
  days.setAttribute('id', 'columnContainer');
  daysFrame.appendChild(days);

  const scrollSpacer = document.createElement('div');
  scrollSpacer.classList.add('scrollSpace');
  scrollSpacer.setAttribute('id', 'scrollSpacer');
  days.appendChild(scrollSpacer);


  const eventScroll = document.createElement('div');
  eventScroll.classList.add('timeScroll');
  eventScroll.setAttribute('id', 'eventScroll');
  timeBase.appendChild(eventScroll);

  const timeColumn = document.createElement('div');
  timeColumn.classList.add('timeHeaderCol');
  timeColumn.setAttribute('id', 'timeColumn');
  eventScroll.appendChild(timeColumn);
  const eventArea = document.createElement('div');
  eventArea.classList.add('eventArea', 'flexed');
  eventScroll.appendChild(eventArea);

  const timeContainer = document.createElement('div');
  timeContainer.classList.add('timeHeader');
  timeContainer.setAttribute('id', 'timeContainer');
  timeColumn.appendChild(timeContainer);

  const gridContainer = document.createElement('div');
  gridContainer.setAttribute('id', 'gridContainer');
  eventArea.appendChild(gridContainer);
  const originPoint = document.createElement('div');
  originPoint.classList.add('timeColumn');
  originPoint.setAttribute('id', 'originPoint');
  eventArea.appendChild(originPoint);
}
/**
 * @desc requires unitsInterval.
 */
function initializeTimeArea() {
  const gridContainer = document.getElementById('gridContainer');
  const timeContainer = document.getElementById('timeContainer');
  const numberOfUnits = (24 * 60) / unitInterval;
  for (let i = 0; i < numberOfUnits; i += 1) {
    const timeUnitBlock = document.createElement('div');
    timeUnitBlock.classList.add('timeUnit');
    const unitBlock = document.createElement('span');
    unitBlock.classList.add('unitBlock');
    unitBlock.innerHTML = muniteToAMPMClock((24 * 60 * i) / numberOfUnits);
    timeUnitBlock.appendChild(unitBlock);
    timeContainer.appendChild(timeUnitBlock);

    const gridRow = document.createElement('div');
    gridRow.classList.add('grid-row');
    gridContainer.appendChild(gridRow);
  }
}

function initializeEvents(events) {
  for (let i = 0; i < events.length; i += 1) {
    createEventNode(events[i]);
  }
}

function initializeReserve(reserves) {
  for (let i = 0; i < reserves.length; i += 1) {
    createReserveNode(reserves[i]);
  }
}

function clearTimeArea() {
  const gridContainer = document.getElementById('gridContainer');
  const timeContainer = document.getElementById('timeContainer');
  clearChildNodes(gridContainer);
  clearChildNodes(timeContainer);
}

function clearEvents() {
  clearChildNodes(originElement);
}

function initializeGlobalVariables(interval, days, initDay, venues) {
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

function initializeCalendar(interval, days, initDay, events, venues, reserves = []) {
  console.log('Initializing grid and events');
  initializeGlobalVariables(interval, days, initDay, venues);
  initializeTimeArea();
  initializeTimeSlots();
  dyanamicallyInitializeDateColumn();
  initializeEvents(events);
  initializeReserve(reserves);
}


function clearCalendar() {
  console.log('clearing grid and events');
  timeSlots = [];
  megaData = {};
  clearTimeArea();
  clearEvents();
  clearReserves();
  clearDateColumn();
}

function dispatchInfoEvent(payload) {
  const event = new CustomEvent('customEventInfo', { detail: payload });
  window.dispatchEvent(event);
}

function dispatchUpdateEvent(payload) {
  const event = new CustomEvent('customEventUpdate', { detail: payload });
  window.dispatchEvent(event);
}

function retriveInfo(element) {
  const unitsX = element.getAttribute('unit-x');
  const unitsY = element.getAttribute('unit-y');
  const duration = element.getAttribute('duration');
  let eventID = element.getAttribute('id');
  const extraData = megaData[eventID];
  eventID = +eventID.slice(6);
  const title = element.firstChild.innerHTML;
  const start = new Date(firstDay);
  const venueIndex = unitsX % numberOfVenues;
  const venueID = config.venues[venueIndex].id;
  start.setDate(start.getDate() + Math.floor(unitsX / numberOfVenues));
  start.setMinutes(start.getMinutes() + (unitsY * unitInterval));
  return {
    start, duration, venueID, eventID, title, megaData: extraData,
  };
}

function updateDatabaseCall(element, creation = false) {
  const payload = retriveInfo(element);
  payload.creation = creation;
  // console.log(payload);
  dispatchUpdateEvent(payload);
}


function createEvent(event) {
  const result = createEventNode(event);
  if (result) {
    updateDatabaseCall(result, true);
    return true;
  }
  return false;
}


function deleteEvent(id) {
  const eventID = `event${id}`;
  const event = document.getElementById(eventID);
  removeEvent(event);
}

function updateEventID(oldID, newID) {
  const previousID = `event-${oldID}`;
  const targetElement = document.getElementById(previousID);
  targetElement.setAttribute('id', `event-${newID}`);
}

function recoverEventNode(removedEvent) {
  console.log('rolling back');
  if (removedEvent == null) {
    return false;
  }
  const unitsX = removedEvent.getAttribute('unit-x');
  const unitsY = removedEvent.getAttribute('unit-y');
  const duration = removedEvent.getAttribute('duration');
  occupy(unitsX, unitsY, duration);
  originElement.appendChild(removedEvent);
  return true;
}

function updateEventNode(event) {
  const eventID = `event-${event.id}`;
  const targetNode = document.getElementById(eventID);
  removeEvent(targetNode);

  const result = createEventNode(event);
  if (!result) {
    recoverEventNode(targetNode);
    return false;
  }
  megaData[eventID] = event.megaData;
  return true;
}


function buildCalendar() {
  initializeCalendarBase();
  console.log('loading frequently used DOM Data');
  originElement = document.getElementById('originPoint');
  dateElement = document.getElementById('dateScroll');
  scrollElement = document.getElementById('eventScroll');
  scrollElement.addEventListener('scroll', scrollListener);
  previousScroll.left = scrollElement.scrollLeft;
  previousScroll.top = scrollElement.scrollTop;
}


function createEventObject(unitsX, unitsY, reservedEventID) {
  const start = new Date(firstDay);
  const venueIndex = unitsX % numberOfVenues;
  const venueID = config.venues[venueIndex].id;
  start.setDate(start.getDate() + Math.floor(unitsX / numberOfVenues));
  start.setMinutes(start.getMinutes() + (unitsY * unitInterval));
  reservedEvents[reservedEventID].venueID = venueID;
  reservedEvents[reservedEventID].start = Math.floor(start.getTime() / 1000);
  return reservedEvents[reservedEventID];
}

function reserveToActive(unitsX, unitsY, eventID) {
  const newNode = createEventNode(createEventObject(unitsX, unitsY, eventID));
  if (newNode) {
    updateDatabaseCall(newNode);
    currentElement.parentNode.removeChild(currentElement);
    delete reservedEvents[eventID];
  }
}

function activeToReserved(id) {
  const target = document.getElementById(`event-${id}`);
  const info = retriveInfo(target);
  const event = {
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
  title: 'test reserved event 101',
  duration: 7200,
  megaData: {
    note: 'asdfjaskf',
  },
};


// export this
function reloadReserve(newReserves) {
  clearReserves();
  initializeReserve(newReserves);
}

function interactStart(event) {
  console.log('start');
  currentElement = event.target;
  const unitsX = event.target.getAttribute('unit-x');
  const unitsY = event.target.getAttribute('unit-y');
  const duration = event.target.getAttribute('duration');
  vacate(unitsX, unitsY, duration);
}


// target elements with the "draggable" class
interact('.draggable')
  .draggable({
    snap: {
      targets: [
        (x, y) => {
          const origin = document.getElementById('originPoint');
          const position = origin.getBoundingClientRect();
          let unitsX = Math.round((x - position.left) / position.width);
          if (unitsX < 0) {
            unitsX = 0;
          }
          if (unitsX >= numberOfColumns) {
            unitsX = numberOfColumns - 1;
          }
          let snapX = position.left + (unitsX * position.width);
          const unitsY = Math.round((y - position.top) / timeUnit);
          let snapY = position.top + (unitsY * timeUnit);
          if (currentElement != null) {
            const duration = currentElement.getAttribute('duration');

            if (isOccupied(unitsX, unitsY, duration / 60 / unitInterval)) {
            // snap back
              const startUnitsX = currentElement.getAttribute('unit-x') || 0;
              const startUnitsY = currentElement.getAttribute('unit-y') || 0;
              snapX = position.left + (startUnitsX * position.width);
              snapY = position.top + (startUnitsY * timeUnit);
            }
          }
          return { x: snapX, y: snapY, range: Infinity };
        },
      ],
      range: Infinity,
      endOnly: true, // soft snapping
      relativePoints: [{ x: 0, y: 0 }],
    },
    // enable inertial throwing
    inertia: true,
    // keep the element within the area of it's parent
    restrict: {
      restriction: '.eventArea',
      endOnly: true,
      elementRect: {
        top: 0, left: 0, bottom: 1, right: 1,
      },
    },
    // enable autoScroll
    // autoScroll: true,
    onstart: interactStart,
    // call this function on every dragmove event
    onmove: dragMoveListener,
    // call this function on every dragend event
    onend(event) {
      console.log('end');
      const origin = document.getElementById('originPoint');
      const position = origin.getBoundingClientRect();
      const x = parseFloat(event.target.getAttribute('data-x')) || 0;
      const y = parseFloat(event.target.getAttribute('data-y')) || 0;
      const previousX = event.target.getAttribute('unit-x');
      const previousY = event.target.getAttribute('unit-y');
      const duration = event.target.getAttribute('duration');
      const unitsX = Math.round(x / position.width);
      const unitsY = Math.round(y / timeUnit);
      if (previousX === unitsX && previousY === unitsY) {
      // snpped back
      } else {
        event.target.setAttribute('unit-x', unitsX);
        event.target.setAttribute('unit-y', unitsY);
        event.target.childNodes[1].innerHTML = compileTimeText(unitsY, duration);
        updateDatabaseCall(currentElement);
      }
      occupy(unitsX, unitsY, duration);
      currentElement = null;
    },
  }).resizable({
  // resize from all edges and corners
    edges: {
      left: false, right: false, bottom: true, top: false,
    },

    // keep the edges inside the parent
    restrictEdges: {
      outer: 'parent',
      endOnly: true,
    },

    snapSize: {
      targets: [
        (x, y) => {
          let units = Math.floor((y + 1) / timeUnit);
          if ((y + 1) % timeUnit > timeUnit * 0.6) {
            units += 1;
          }
          if (units < 1) {
            units = 1;
          }
          if (currentElement != null) {
            const unitsX = currentElement.getAttribute('unit-x');
            const unitsY = currentElement.getAttribute('unit-y');
            // console.log(unitsX, unitsY, units)
            // console.log(timeSlots)
            if (isOccupied(unitsX, unitsY, units)) {
            // snap back
              const duration = currentElement.getAttribute('duration');
              units = Math.floor(duration / 60 / unitInterval);
              if ((duration / 60) % timeUnit > timeUnit * 0.6) {
                units += 1;
              }
              if (units < 1) {
                units = 1;
              }
            }
          }
          return { y: (units * timeUnit) - 1 };
        },
      ],
      range: Infinity,
      endOnly: true, // soft snapping
    },
    inertia: true,
    onstart: interactStart,
    onend(event) {
      console.log('end');
      const height = parseInt(currentElement.style.height, 10);
      const duration = Math.round((height + 1) / timeUnit) * unitInterval * 60;
      const prevoiusDuration = parseInt(event.target.getAttribute('duration'), 10);
      const unitsX = event.target.getAttribute('unit-x');
      const unitsY = event.target.getAttribute('unit-y');
      if (duration === prevoiusDuration) {
      // snpped back
      } else {
        currentElement.setAttribute('duration', duration);
        event.target.childNodes[1].innerHTML = compileTimeText(unitsY, duration);
        updateDatabaseCall(currentElement);
      }
      occupy(unitsX, unitsY, duration);
      currentElement = null;
    },
  }).on('resizemove', (event) => {
    event.target.style.height = `${event.rect.height}px`;
  })
  .on('tap', (event) => {
    dispatchInfoEvent(retriveInfo(event.currentTarget));
    event.preventDefault();
  });

// reserved event
// target elements with the "reservedEvent" class
interact('.reservedEvent')
  .draggable({
    snap: {
      targets: [
        (x, y) => {
          // console.log(x, y);
          const position = originElement.getBoundingClientRect();
          const reservedPostion = reservedElement.getBoundingClientRect();

          if (y >= position.y && y <= reservedPostion.y) {
            let unitsX = Math.round((x - position.left) / position.width);
            if (unitsX < 0) {
              unitsX = 0;
            }
            if (unitsX >= numberOfColumns) {
              unitsX = numberOfColumns - 1;
            }
            const unitsY = Math.round((y - position.top) / timeUnit);
            if (currentElement != null) {
              // console.log(reservedElement.getBoundingClientRect());
              const duration = currentElement.getAttribute('duration');
              const eventID = currentElement.getAttribute('eventID');
              const occupationCheck = isOccupied(unitsX, unitsY, duration / 60 / unitInterval);
              // console.log(occupationCheck, occupationCheck == false, occupationCheck === 0)
              if (occupationCheck || occupationCheck === 0) {
              // do nothing
              // console.log('occupied');

              } else {
              // record attributes to create
              // console.log('fired');
                reserveToActive(unitsX, unitsY, eventID);
              }
            }
          }
          return { x: 0, y: 0 };
        },
      ],
      range: Infinity,
      endOnly: true, // soft snapping
      relativePoints: [{ x: 0, y: 0 }],
    },
    onstart: (event) => {
      currentElement = event.target;
    },
    // call this function on every dragmove event
    onmove: dragMoveListener,
    // call this function on every dragend event
    onend(event) {
      event.target.style.webkitTransform = `translate(${0}px, ${0}px)`;
      event.target.style.transform = `translate(${0}px, ${0}px)`;

      event.target.removeAttribute('data-x');
      event.target.removeAttribute('data-y');
      currentElement = null;
      // console.log('still fired');
    },
  });

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
  if (event.code === 'Digit0') {
    updateEventNode({
      id: 1,
      title: 'event 1',
      start: 1519653600, // 26 9am
      duration: 36000,
      venueID: 11,
      megaData: {
        note: 'new megaData',
      },
    });
  }
  if (event.code === 'Digit9') {
    recoverEventNode(removeEvent(document.getElementById('event-1')));
  }
  if (event.code === 'Digit8') {
    const events = [
      {
        id: 1,
        title: 'event 1',
        start: 1519653600, // 26 9am
        duration: 3600,
        venueID: 11,
        megaData: {
          note: 'asdfjaskf',
        },
      },
      {
        id: 2,
        title: 'event 2',
        start: 1519729200, // 27 6am
        duration: 5400,
        venueID: 11,
        megaData: {
          note: 'asdfjaskf',
        },
      },
      {
        id: 3,
        title: 'event 3',
        start: 1519567200, // 25 9am
        duration: 3600,
        venueID: 22,
        megaData: {
          note: 'asdfjaskf',
        },
      },
      {
        id: 4,
        title: 'event 4 with a super long name abcdabcdabcdabcd',
        start: 1519736400, // 27 7am
        duration: 3600,
        venueID: 11,
        megaData: {
          note: 'asdfjaskf',
        },
      },
      {
        id: 5,
        title: 'event 5',
        start: 1519880700, // 1 0:05am
        duration: 360000,
        venueID: 11,
        megaData: {
          note: 'asdfjaskf',
        },
      },
    ];

    const venues = [
      {
        id: 11,
        name: 'venue 1',
      },
      {
        id: 22,
        name: 'venue 2',
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

    const reserves = [
      {
        id: 111,
        title: 'test reserved event 111',
        duration: 7200,
        megaData: {
          note: 'asdfjaskf',
        },
      },
      {
        id: 112,
        title: 'test reserved event 112',
        duration: 7200,
        megaData: {
          note: 'asdfjaskf',
        },
      }, {
        id: 113,
        title: 'test reserved event 113',
        duration: 7200,
        megaData: {
          note: 'asdfjaskf',
        },
      }, {
        id: 114,
        title: 'test reserved event 114',
        duration: 7200,
        megaData: {
          note: 'asdfjaskf',
        },
      }, {
        id: 115,
        title: 'test reserved event 115',
        duration: 7200,
        megaData: {
          note: 'asdfjaskf',
        },
      }, {
        id: 116,
        title: 'test reserved event 116',
        duration: 7200,
        megaData: {
          note: 'asdfjaskf',
        },
      }, {
        id: 117,
        title: 'test reserved event 117',
        duration: 7200,
        megaData: {
          note: 'asdfjaskf',
        },
      }, {
        id: 118,
        title: 'test reserved event 118',
        duration: 7200,
        megaData: {
          note: 'asdfjaskf',
        },
      }, {
        id: 119,
        title: 'test reserved event 119',
        duration: 7200,
        megaData: {
          note: 'asdfjaskf',
        },
      }, {
        id: 120,
        title: 'test reserved event 120',
        duration: 7200,
        megaData: {
          note: 'asdfjaskf',
        },
      },
    ];

    initializeCalendar(60, 7, '2018-02-25', events, venues, reserves);
  }
  if (event.code === 'Digit7') {
    clearCalendar();
  }
  if (event.code === 'Digit6') {
    createReserveNode(testReserveEvent);
  }
  if (event.code === 'Digit5') {
    activeToReserved(3);
  }
  if (event.code === 'Digit4') {
    toggleShow();
  }
  if (event.code === 'Digit1') {
    shiftLeft();
  }
  if (event.code === 'Digit2') {
    shiftRight();
  }
  if (event.code === 'Digit3') {
    resetPosition();
  }
});
// call exported buildCalendar and comment this part if mount timing need to be altered.
window.onload = () => {
  buildCalendar();
};
