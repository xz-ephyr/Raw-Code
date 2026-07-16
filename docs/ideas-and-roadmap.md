## Memory & Knowledge System
[  ] Fix my dB and also my llm memory of user entire wokrflow
[  ] Add soul.md for llm memory itself, add agents.md for agents memory themselves. Add value.md a curated and a handpicked memory from both soul and agents thag will be about the evaluation of user entire history and logs in form of memory instead
[  ] Refine my all db data, logs, and agents logs and so on to with uuid something like that to them each in db just like opencode does it db system.

## Dashboard & Metrics
[  ] Make the dashboard more refined and add a splash one different gradient color to each box on their top inner corner and also a real metrics charts and ui modal pop up to reveal more information about the board. That modal pop will be design like the settings but little small in size. This modal will have self metrics specific to them and logs condiged for each one
[  ] Add currently running workflow cards below the dashboard for easy access

## Workflow Pages
[  ] Refine workflow page design
[  ] Make the template modal and card more refined.
[  ] Redesign the new workflow page coz it is piece of shit

## Mindmap & Node System
[  ] In mindmap tab section in each or any workflow, when any card node is clicked - a slide out modal will show to show information about that box from the bottom corner of the page
[  ] Use real mindmap packages (react flow) and create a reusable rectangular box component for display mindmaps
[  ] Add mini logs icon that open a dropup smooth modal in mindmap page to show current info logs about current task.

## Agent System & Persona 
[  ] Refine and optimize the system prompts and give system a codename "martian" - "my name is martian, how can I help you today and also add that any task given that involve lot of work or basic confusion task should always ask questions and the way the questions will appear is through our questionpanel we desiged before
[  ] Aggregrate subagent mode to teamwork for long running agents task and default to normal connector call, tool call and subagents
[  ] Add to the ai responses bubble a wait and counting api error and retry after time put(second increment start from 2s, 4s, 8s, 15s, 20s)
[  ] Create an agents skill called pro-dev which will be derive from studying opencode codebase entirely scratch and turn it into deep-thought on how to build software pro-level ways and not really too much on third lock softwarepackage to my any future or finetuning a codebase to match their technicality, professionality, smartness in how much they put into the software, how the app so good and optimized and why they apply the trick and technological strategies to the app and how I can to mine too by making it better and done well instead of slopping it with ai agent coding codes.

## LLM Workflow Builder (Palantir-style)
[  ] Add ability to set a workflow from the chat page using native llm and custom ui component to select tolls and things that the task will run on just like palantir aip ui panel that allow them to do and customize anything for customers. The one that will do this is a single agent that can do anything (can schedule, research, setup task/ workflow/request, get & read data from connectors, tools and flows etc) this agent will be in chatinput agent mode dropdown with a given name to it

## Todo-Tool & Task Breakdown
[  ] Add todo-tool for llm or agent to break task into mini task to execute them step by step and a failsafe that must always checked each task if llm or agent forget to mark the but this only work if it think they have move to next task on the list and the radio box is bit ticked yet after 40sec. The ai will try to tick it first and if fail or forgetc, another underlying mechanism will tick. The mechanism will always be with them incase something happens but it must always be the second resort to when they either forget/try to tick 2 but fail/try to complete task before ticking

## UI Refinements
[  ] Refine the pdf tool bar to be small coz too big and also Fix how the streams text inside it is not clearly renders coz it is just a markdown coming from aj that is renders there like that
[  ] Add to the artifact a loading like Google when loading a search results that literally line but this time ours will be for loading artifact content instead of just showing it fast and quick like that
[  ] Refine the chatpage ui for dynamic animation when agents doing task
[  ] Refine the ui and backend of logs

## Fixes & Bugs
[^] Fix user bubble issue
[  ] Fix artifact streaming leaking out to main stream and still be in artifact at same time
[  ] Fix api tab dashboard in settings
[  ] Fix issue of rendering stream main one with different font for header, quote, and normal text

## Integration & Architecture
[  ] build my own mini lightweight browser agents can use
Use third party api for my connector

## Onboarding & Configuration
[  ] Scrap the onboarding and turn it into one 3 step configuration page

## Polish & Cleanup
[  ] Cleanup codebase and refine the readme file and do lastminute finetuning


## llm stream using server side event to the frontend, dicthing vercel ai sdk and taking inspiraton from openocde sse stream technniqe, exact.
[ ]i have the opencode at /dok-tor, also teh docmentation at /migration/g-llm-streaming and wht am using for my stream ing teh vercel sdk is at /core and /src.
[ ] find all thing necessary to build a normal pictre of this and also waht am trying to achieve is to move from third party tools to built in one like they does to opencode and i wold liek mine to work too like that also do more indepth code eploration to paint more understanding of this events in term of what we are trying to acheive. 
{ }this is not an sdk building mine from sratch, this is jst a way of me building an alternate to customize my own software that can be prod of when open-sourced and can be niquely be achievable
[  ] Merge my native vercel ai sdk with llm configuration i have in package