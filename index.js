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

const firstDay = new Date(1519621200000); //Feb26th
const lastDay = new Date(firstDay)
lastDay.setDate(firstDay.getDate() + 7);
let data = {
  events: [
    {
      title:"event 1",
      start:1519653600,// 26 9am
      duration:3600,
    },
    {
      title:"event 2", 
      start:1519729200,// 27 6am
      duration:5400,
    },
    {
      title:"event 3",
      start:1519567200,// 25 9am
      duration:3600,
    }
  ]
}


window.onload= ()=>{
  console.log('load')
  originElement = document.getElementById("originPoint");
  dateElement = document.getElementById("dateScroll");
  scrollElement = document.getElementById("eventScroll");
  scrollElement.addEventListener('scroll', scrollListener);
  previousScroll.left = scrollElement.scrollLeft;
  previousScroll.top = scrollElement.scrollTop;
  console.log(data);
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
          // let event = currentElement.getBoundingClientRect();
          // x = event.left;
          // y = event.top;
          let origin = document.getElementById("originPoint");
          let position = origin.getBoundingClientRect();
          let unitsX = Math.round((x - position.left)/ position.width);
          let snapX = position.left + unitsX * position.width;
          let unitsY = Math.round((y - position.top)/ timeUnit);
          let snapY = position.top + unitsY * timeUnit;
          // console.log(position)
          if(false){
            //snap back
            let startUnitsX = currentElement.getAttribute('unit-x') || 0;
            let startUnitsY = currentElement.getAttribute('unit-y') || 0;
            snapX = position.left + startUnitsX * position.width;
            snapY = position.top + startUnitsY * timeUnit;
          }
          console.log(currentElement)
          console.log(unitsX,unitsY,position,snapX, snapY)
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
      // console.log(event.target)
      currentElement = event.target;

    },
    // call this function on every dragmove event
    onmove: dragMoveListener,
    // call this function on every dragend event
    onend: function (event) {
      let origin = document.getElementById("originPoint");
      let position = origin.getBoundingClientRect();
      let x = parseFloat(event.target.getAttribute('data-x')) || 0;
      let y = parseFloat(event.target.getAttribute('data-y')) || 0;
      let unitsX = Math.round(x/ position.width);
      let unitsY = Math.round(y/ timeUnit);
      event.target.setAttribute('unit-x', unitsX);
      event.target.setAttribute('unit-y', unitsY);
      currentElement = null;
    }
  });

  function scrollListener(event){
    if(currentElement == null){
      
      console.log("scrolled", scrollElement.scrollTop, scrollElement.scrollLeft);
    } else {
      console.log("scrolled");
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
    let newEvent = createEventNode(data.events[2]);
    alert('keypress event\n\n' + 'key: ' + event.code);
  }
  if(event.code == 'Digit9'){
    alert('Current Element: ' + currentElement);
  }
});

function createEventNode(event){
  if(lastDay.getTime() <= event.start*1000 || firstDay.getTime() > event.start * 1000){
    console.log('not in this week', lastDay.getTime(), event.start*1000, firstDay.getTime());
    return;
  }
  let newEvent = document.createElement('div');
  // let newContent = document.createTextNode("Hi there and greetings!"); 
  newEvent.classList.add('draggable');
  newEvent.classList.add('event');
  let team = document.createElement('span');
  team.innerHTML = event.title;
  team.classList.add('eventText');
  newEvent.appendChild(team);
  let coordinates = timeToCoordinates(new Date(event.start*1000));
  let timeSpan = document.createElement('span');
  timeSpan.innerHTML = compileTimeText(coordinates.unitsY, event.duration);
  timeSpan.classList.add('eventText')
  newEvent.appendChild(timeSpan);
  
  console.log(coordinates)
  let height = Math.floor(event.duration / 300) * 4;
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
  newEvent.setAttribute('unit-x', coordinates.unitsX);
  newEvent.setAttribute('unit-y', coordinates.unitsY);
  originElement.appendChild(newEvent);
  return newEvent;
}

function timeToCoordinates(time){
  let difference = time.getTime() - firstDay.getTime();
  unitsX = Math.floor(difference / (1000*3600*24));
  unitsY = Math.floor((difference % (1000*3600*24)) / (1000 * 60 * unitInMinute));
  return {unitsX, unitsY}
} 

function compileTimeText(unitsY, duration){
  let additionalMinutes = Math.floor(duration / 60);
  let startMinutes = unitsY * unitInMinute % 60;
  let startHours = Math.floor(unitsY * unitInMinute / 60);
  startHours = startHours > 12 ? `${startHours - 12}:${startMinutes} PM` : `${startHours}:${startMinutes} AM`;
  
  let endMinutes = (unitsY * unitInMinute + additionalMinutes) % 60;
  let endHours = Math.floor((unitsY * unitInMinute + additionalMinutes) / 60);
  endHours = endHours > 12 ? `${endHours - 12}:${endMinutes} PM` : `${endHours}:${endMinutes} AM`;
  return startHours + ' - ' + endHours;
}

function overlap(unitX,unitY, length){

}