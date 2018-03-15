# calendar
based on google calendar layout and css  
visually highlighting dropping column for soft snapping  
synchronize time area and date area horizontal scrolling  
function calculated snapping point  
synchronize dragging while scrolling  
all events are aligned to origin div(first event column div)  
# update 2018/02/27 Mile Stone 1
basic functionalities:  
Dragging events, soft snapping (need adjustment to switch to hard snapping due to significantly more calls for snapping point function)  
Event conflicts detection  
Date column initialization  
# update 2018/02/28
Change unit concept and dynamic timeUnit render:  
> the previous unit is related to the blick height which is set to 48px, that is when unit = 48 it means 1 block as a units, similarly 4px means 1/12 block as a units  
> the new unit is fixed with block size, and the number of blocks will be dynamically rendered. That is, with smaller time interval, more blocks are created  

Resize from bottom to change duration and coresponding data, vacancy manipulation.  
# update 2018/03/01 Mile Stone 2
Change days columns to be dynamically rendered
# update 2018/03/14   
create interfaces to communicate with other frame work  
Also moved initialization from window.onload to functions that will be exported.
list of exported functions:  
initializeCalendar(interval, days, initDay, events, venues),  
clearCalendar(),  
createEvent(event)  

Dispatched the event:  
customEventUpdate  
example payload:  
{creation:false,  
duration:"3600",  
eventID:"3",  
start:Mon Feb 26 2018 00:00:00 GMT-0500 (Eastern Standard Time) {},  
title:"event 3",  
venueID:0}  
# update 2018/03/15  
Create initialization function to build the base element. Therefore, the lines of html will be further reduced. Making it easier to integrate with other frameworkds.  
