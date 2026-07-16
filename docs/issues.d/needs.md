1. today, am going to add more providers to omniroute
2. fix the isse of unabe to use enter key to insert the plugin in teh input box. i also want to make some modification to the plugin page, cards, modal popup.
[^]3. download ai model icon for gemini, opencode, groq, cerebras, and other free providers
scrap teh timeline and trn it to on be actual text streaming instead of streaming on the pad. also scrap teh ide and rename it to some else and also download all favicon for languages and add tehm to public. 
4. pick teh feature one by one and tackle them on. this will allow me to finish this project faster and much more easier for me to do on teh long run. start with;
   [^] 1. models provider fixing forever 
    2. sub agent fixng forerver
    3. fix teh issue of teh explorer agent to always explre and rip off teh hand offing of task to teamwork completely. this will onlymean iving it complete permission that it can run anything it want ing tool givne to it only. also chane it icon to something else like a single hand ptting it index up. chane the bug bster name to auto-debug and give a red-gold color
    4. fix teh ui of permission card that show on top of teh box when in active state.
    5. make teh grep and glob only thing sthat will be brainwashed into teh harness that it shold always faviour it when explorin new project any kind of project it may be
    6. change teh schedle icon and also add a notification icon on the right side of teh panel sidebar closing icon but only show when sidebar open only.
    7. add brief rectannglar card below the input box when in idle state. this will contain what happen in workflow, schedule. it will have brief header named "task brief and infront of that on teh right side of the section will be "see all" clcikable text that will smoothly morphh the input box that is in idle state to be invisible to display full brief cards well coz it will only able to show one only and the next card will only show breif of it heade below teh first one only. the morph an be cace with cancel x icon and return everything back to normal state. teh showing of brief morphin fom something that is bottom to taking all paes from chatinput box is not somthing that ust cause a single problem, so be careful. when any of teh card brief et clicked, it will take ser to schedle page and further explanation is down below
    8. below teh input box in that box container that host teh shortcut for project creation and permission requirements. on it frontside on teh right side of teh cntainer will be conector liek 5-6 connector i have installed in my plugin stacked on each other along teh x-axis just like i stack my sources from web-search that normally show beside the regenerate icon. and tehy will be put inside a pill that fit them tightly and have cancel icon on teh right inside of teh pill that morphed out when my cursor hover on it. and in oother word, this pill when clicked will smoothly route teh ser to the plugin page and they can just cancle teh pill with the cancel icon. 
    9. move teh greeting text to the left side of teh input box instead of centering.
    10. add some cool features to the chats page that is not already there is shoudl be there professionally
    11. create a zombie image like 20+ of it that will be use for sub-agent to identify them instead of generism 
    11. 
    
5. redesign teh schedule page to match what i saw ealier. all corner radius must be 6px only nothing more and all design must be fous on being slick rather than generism and make sre if any box in this "create new" modal popup must ensre it fill the inner width of the modal pop instead of leavig parts that will not be needed. for droplost or dropdownlist you are going to be designing should be deing as i design teh one for teh plugin / shortcut in that chatinput box idle state. also first clean teh page from any foreign color and use one definite color bg we have in place thorughout. we will replace schedle icon to this "<HugeiconsIcon icon={CheckListIcon} />"
    1. it will be and have a brief  instead with empthy/no schedle state, it will have he create new schedule btton as that place but redesign to be slcik and small with texxt "plus icon + create new". it will show a popp modal but in modal rectangular form that will have the width of 300px and heigh tof 2.5x the width. it will have teh header "new schedule" in medium text and below it will be a small input text that has like pill-shape with 6px corner radius and will fill the width of the inner box that will be for naming teh schedle or clicking clcikin an icon inisde the typing is detect taht will atomaticlly generate this kind of serial name (sl-34dew3, it will be generated randomly with that initial "sl" always starting it and combinnation of number and letter of 6 with dash "-" in between them) that will be tag to each schedle task, if task is recurring, the tag will automatically craete a children tagline that connect main first tag so that it will be traceable to any one if it is recurring and it it is ince. if user later type or dont given teh schedule a name, the tag key still work same nder-the-hood for tracking tasks just we jsut want to give user abiity to name them instead of getting tag-key instead in taht input box. 
    2. below teh input area will the small eader text "add model", below it will be a model list of all i have in my app and also the pill that will dropdown these models will design as i design the dropdown of plugin /shortcut in chatinput page. and teh pill can also serve as a search place instead of just static to search for models i want instead of manualyy scrolling down and make . bellow that model list dropdwon will be an header named "use sub-agents" infront of it on teh right side on the inner side of the modal will be a toggle that when toggle on will add new section and then trigger a fast backgrond read to extract teh usr intent from the prompt section and synthesis it into how many sug-aget will be enough to cover the task completely, this section will read the user prompt as said and {teh user prompt section will be show below teh naming shedule section with inpt box of 85px and an expand icon inisde it when typing is detected} since the toggle is on and a loading state show before teh cetion content for se sub-aet show to process what we said now in background. after it is done, it wil show two pill box, ne for agent needed his one will be minimal and not take much space while the other will show teh list of agent identity it want to use. the agent identity droplist will have the image as profile we generated before on their right and also identity name {usaly 5-7 letter word real-name-like} generated on teh side of the profile. i can click any of teh aent list tab to show more detail about it what tools it goin to se , system promtp it was given when readign teh initail usr prompt and also profile and identity it was given and so on like that.
    3. next section will be time, use-tool section and it toggleand toggle select of tools based on task and so on liek that nase on what should be insluded in a scheduling task
    4. all must wokr end to end and reusable component file that dont exist before can be created to minimize code duplication and bloatin existing file and also embrace teh act of simplifying and splitting code file into tiny little one to avoid large file in a s single file existed or just created.
    5. the content width of teh page will be change to exactly 1000px to give mre space to content very well. and that search bar will be shorten to 1.5/3 {translate to actual px numnber} crrent size to be place n teh left side of te create new button instead f below teh headers. 
    6. to display task schedule that have finished, this will be design as we design teh brief section below teh chatinput bo in teh idle, remember? but thsi time will be when any box card s clicked, it will morph the page smoothly to show more content about the card clicked, ence showing more data and will have "arrow back and back text" button to go back to shedule home state. so thsi means, it home page will contain card box with exact with of teh content idth {1000px} and height 500px with border line of 0.5px gray with 8px conrner radius and also clickable with less haptic hover click and non-generic clciks effect too.furyer design will be discuss 
    7. there will be a section though that will be use for show data of schedule jobs/tasks monitoring-scale feel noard above tehe cards below teh headers


6. redsigning teh workflow page, teh same will apply to it as we design the schedule page but there will be some twickes to thing we add and all oteh rsub-feature wit will have alng the way coz thsi one {this page sectin} is for orchestratin large amount of agents and that are doin or will do or can do all sort of things and so on like tha. it will has teh same cntent width of 1000px width as use in schedule page and the initail design will almost look frontedly teh same bt different in terms of what tehy actually do   

5. 







[  ] Fix the slash command design
[  ] Fix artifact rendering
[  ] Design workflow page; add a dashboard 3 boxes they are clickable to show new screen page that will reveal lot and denser information, one for currently run flows, one for states idle/ complete/ running/starting/paused. One for 
[  ] Below the dashboard will be template (beta) 
[  ] It will be design to look like that one of plugin page but has more height, it will have template name (3 short word) on the left side of the title will be icon comprises in the template (Gmail, YouTube, github, jirra etc) below will be a description of what it does and that plus icon job is to allow user to either use template or fork it (means reuse them)
[  ] The template card will be clickable  to show a modal decently and smoothly to reveal more information necessary for the template (what it contain will be more info about it)
[  ] Inside it will also be a small description generate about the template
[  ] User can click plus to add template directly which will show on the board that new runs is available at specific time and it state
[  ] The create new will have input naming for the runs, a rough system prompt section box from user, a section that has dropdown to select connector with the actual icons, a section for date a real date and time clock pm and an, a real purple button will be at the bottom of then all that say save and continue it will have 6px corner and width if 900px. All things inside the create new runs page will have contetn width of 900px and all input box and all things involving boxes will have full width except like dat le dropdown clock and something like that.
[  ] This create new runs page must be universal for any runs
[  ] After user save and continue. There will show another screen that will show part of the page a step timeline of of llm synthesing user runs and generated title and description for it couplulating couple flow screen. It will have 3 tabs in that page, one for timeline and normal stream of llm it will has an input box same as the one in chatpage but for user to ask or modify runs using plain language and then llm synthesing, the second for mind-map of the run connected to each other, the third one is for inspecting what the runs do/error/succes/data retrieved/ data used form retrieved/ etc this place is for debugging and finetuning runs using correct-based feedback coz all run will almost and more likely to involve run except things like inspecting rss-feed or stalking YouTube channel and so on like that.












[  ] Use third party api for my connector 
[  ] Fix my dB and also my llm memory of user entire wokrflow
[  ] Add soul.md for llm memory itself, add agents.md for agents memory themselves. Add value.md a curated and a handpicked memory from both soul and agents thag will be about the evaluation of user entire history and logs in form of memory instead 
[  ] Refine workflow page design
[  ] Make the template modal and card more refined.
[  ] Make the dashboard more refined and add a splash one different gradient color to each box on their top inner corner and also a real metrics charts and ui modal pop up to reveal more information about the board. That modal pop will be design like the settings but little small in size. This modal will have self metrics specific to them and logs condiged for each one
[  ] Add currently running workflow cards below the dashboard for easy access
[  ] In mindmap tab section in each or any workflow, when any card node is clicked - a slide out modal will show to show information about that box from the bottom corner of the page 
[  ] Redesign the new workflow page coz it is piece of shit
[  ] Refine and optimize the system prompts and give system a codename "martian" - "my name is martian, how can I help you today and also add that any task given that involve lot of work or basic confusion task should always ask questions and the way the questions will appear is through our questionpanel we desiged before 
[  ] Add ability to set a workflow from the chat page using native llm and custom ui component to select tolls and things that the task will run on just like palantir aip ui panel that allow them to do and customize anything for customers. The one that will do this is a single agent that can do anything (can schedule, research, setup task/ workflow/request, get & read data from connectors, tools and flows etc) this agent will be in chatinput agent mode dropdown with a given name to it
[  ] Refine my all db data, logs, and agents logs and so on to with uuid to them each in db just like opencode does with it db system.
[  ] Refine the pdf tool bar to be small coz too big and also Fix how the streams text inside it is not clearly renders coz it is just a markdown coming from aj that is renders there like that
[  ] Add to the artifact a loading like Google when loading a search results that literally line but this time ours will be for loading artifact content instead of just showing it fast and quick like that 
[  ] Add todo-tool for llm or agent to break task into mini task to execute them step by step and a failsafe that must always checked each task if llm or agent forget to mark the but this only work if it think they have move to next task on the list and the radio box is bit ticked yet after 40sec. The ai will try to tick it first and if fail or forgetc, another underlying mechanism will tick. The mechanism will always be with them incase something happens but it must always be the second resort to when they either forget/try to tick 2 but fail/try to complete task before ticking
[  ] Use real mindmap packages (react flow) and create a reusable rectangular box component for display mindmaps
[  ] Refine the ui and backend of logs
[  ] Add mini logs icon that open a dropup smooth modal in mindmap page to show current info logs about current task.
[^] Fix user bubble issue
[  ] Fix artifact streaming leaking out to main stream and still be in artifact at same time
[  ] Fix api tab dashboard in settings 
[  ] Add to the ai responses bubble a wait and counting api error and retry after time put(second increment start from 2s, 4s, 8s, 15s, 20s)
[  ] Scrap the onboarding and turn it into one 3 step configuration page 
[  ] Merge my native vercel ai sdk with llm configuration i have in package
[  ] build my own mini lightweight browser agents can use
[  ] Fix issue of rendering stream mqin one with different font for header, quote, and normal text
[  ] Refine the chatpage ui for dynamic animation when agents doing task 
[  ] Aggregrate subagent mode to teamwork for long running agents task and default to normal connector call, tool call and subagents
[  ] Create an agents skill called pro-dev which will be derive from studying opencode codebase entirely scratch and turn it into deep-thought on how to build software pro-level ways and not really too much on third lock softwarepackage to my any future or finetuning a codebase to match their technicality, professionality, smartness in how much they put into the software, how the app so good and optimized and why they apply the trick and technological strategies to the app and how I can to mine too by making it better and done well instead of slopping it with ai agent coding codes.
[  ] Cleanup codebase and refine the readme file and do lastminute finetuning 
[  ] Screenrecord me using the app
[  ] Write a video script how it
[  ] Create thumbnail and description 
post on YouTube












[  ] Security audit & fixes skills
This skills will hunt for Security and vulnerabilities CVE and patch them 

[  ] Bug and clean code hunter skills
This skills will hunt for bugs and dead code and patch them. This skill will be added to my already file structure skill and then renamed to pro-dev skill 

[  ] Optimization skills
This skills sole purpose is tohunt for core app dev that will slow things down, not or lack ultimum optimization well enough and then patch/Optimize and refine them to be faster/efficient/smart enough to make betger products and also makes the core app backbone be professionally better version of previous one. Only things that matter is making current implementation better than current or previous version, that is what it purpose are only. 

[  ] Mock-data-hunter fixing skills 
This skill hunt for anything in codebase that is retrieving, sending, generating or garaging mock data in or out and them patch it.