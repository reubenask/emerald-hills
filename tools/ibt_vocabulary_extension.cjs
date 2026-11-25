// Original classroom passages. Factual sources are recorded separately from student questions.
const sources = {
 cellular: [
  ['Qualcomm: wireless signals and cellular networks','https://www.qualcomm.com/news/onq/2019/10/fundamentals-wireless-signals-and-cellular-networks'],
  ['Nokia Bell Labs: history of the cellular concept','https://www.nokia.com/bell-labs/about/history/'],
  ['Ericsson: changing cells during movement','https://www.ericsson.com/en/blog/2024/12/how-to-maintain-high-performance-radio-connections-during-mobility']
 ],
 meanings: [
  ['Collins English Dictionary: cell','https://www.collinsdictionary.com/dictionary/english/cell'],
  ['OpenStax: foundations of cell theory','https://openstax.org/books/microbiology/pages/3-2-foundations-of-modern-cell-theory'],
  ['Microsoft: row and column cell references','https://learn.microsoft.com/en-us/troubleshoot/microsoft-365-apps/excel/numeric-columns-and-rows']
 ],
 meteorites: [
  ['NASA: meteor and meteorite facts','https://science.nasa.gov/solar-system/meteors-meteorites/facts/'],
  ['American Museum of Natural History: meteorite surfaces and weathering','https://www.amnh.org/exhibitions/permanent/meteorites/meteorites/what-does-a-meteorite-look-like']
 ]
};
const passages = [
 {
  title:'Why Are They Called Cell Phones?',kind:'cellular',
  paragraphs:[
   'The word <u>cellular</u> describes the way a mobile network is organized. Instead of treating a whole region as one radio service area, engineers divide coverage into smaller areas called cells. Base-station antennas <u>transmit</u> and receive radio signals for these areas. The name refers to this arrangement of cells, not to a biological cell inside the handset or simply to the existence of towers. Antennas can be installed on buildings as well as towers.',
   'The cellular approach helps increase network <u>capacity</u>: the amount of communication the system can handle. Radio resources are limited, so networks must <u>utilize</u> them efficiently. Frequencies can be used again in different places, with careful planning and control of <u>interference</u>, the unwanted effect of competing signals. This reuse allows more people to communicate than would otherwise be possible with the same radio resources.',
   'Cells do not have to be <u>uniform</u> in size or shape. Their coverage can <u>vary</u> with antenna settings, buildings, terrain and other conditions. The neat hexagons in diagrams are a model, not the exact boundaries of real radio signals. Coverage areas can <u>overlap</u>; a phone may receive signals from more than one cell.',
   'As a user moves, the network can <u>coordinate</u> a change to another suitable cell. This transfer is called a <u>handover</u>, or handoff. The network aims to keep the service working during the change. Cell sites are also connected to the wider network, which carries calls and data onward. Thus, a cell phone is named for the cellular network it uses, not for the route between two particular towers.'
  ],
  questions:[
   ['cellular','organized into connected coverage areas',['powered by microscopic organisms','limited to one large transmitter','connected only by underground wires'],'Here cellular describes the network arrangement of smaller coverage cells.','Topic vocabulary: verified telecommunications sources'],
   ['transmit','send',['store','weaken','translate'],'Antennas send radio signals as well as receive them.','IMG_2352.JPG: transmit'],
   ['capacity','amount a system can handle',['distance a signal must travel','price a customer must pay','time a battery takes to charge'],'The following clause identifies capacity as the amount of communication the system can handle.','Studied academic and technical vocabulary'],
   ['utilize','make use of',['set a limit on','make copies of','take the place of'],'The network makes efficient use of its limited radio resources.','IMG_2352.JPG: utilize (ticked)'],
   ['interference','disruption caused by competing signals',['a planned transfer of a connection','a supply of stored electricity','a map of the network boundaries'],'The passage describes interference as the unwanted effect of competing signals.','Topic vocabulary: verified telecommunications sources'],
   ['uniform','the same throughout',['permanently fixed','easily measured','closely connected'],'The cells need not all have the same size or shape.','IMG_2352.JPG: uniform (ticked)'],
   ['vary','differ or change',['come to an end','remain in one place','become easier to see'],'Coverage changes or differs with settings and surrounding conditions.','IMG_2352.JPG: vary (ticked)'],
   ['overlap','extend into some of the same space',['remain at equal distances','exclude every weaker signal','join only at a single point'],'Overlapping coverage areas share part of their space.','Topic vocabulary: verified telecommunications sources'],
   ['coordinate','organize different parts to work together',['measure every part separately','replace a damaged component','delay a decision indefinitely'],'The network organizes the change between cells so the parts work together.','Studied academic and technical vocabulary'],
   ['handover','transfer of a connection to another cell',['construction of a new antenna','conversion of radio waves into stored energy','replacement of a phone with a newer model'],'The passage explicitly calls the change to another cell a handover or handoff.','Topic vocabulary: verified telecommunications sources']
  ]
 },
 {
  title:'One Word, Several Meanings: Cell',kind:'meanings',
  paragraphs:[
   'An English word does not always have one <u>fixed</u> meaning. Consider cell. In a prison, a <u data-sense="prison">cell</u> is a small room in which a prisoner is kept. In biology, a <u data-sense="biology">cell</u> is a basic structural and functional unit of life. These two uses do not describe the same kind of object, although each suggests a separate unit or bounded space.',
   'In an electrical device, an electrochemical <u data-sense="electrical">cell</u> produces electrical energy through chemical reactions. A battery can contain one or more such units. In a spreadsheet, a <u data-sense="spreadsheet">cell</u> is one box where a user can enter data or a formula. Its position is identified by the <u>intersection</u> of a row and a column: in the usual letter-and-number notation, B3 is in column B, row 3.',
   'These meanings are <u>analogous</u> in one respect: each identifies a unit within a larger arrangement. However, this comparison should not hide their differences. A living cell has biological processes; a spreadsheet box does not. The <u>function</u> of an electrical cell also differs from the purpose of a room in a prison.',
   'Readers therefore need to interpret the word in <u>context</u>. Nearby words such as microscope, guard, voltage or formula provide clues. A <u>precise</u> interpretation depends on those clues, rather than on automatically choosing the first dictionary definition that comes to mind.'
  ],
  questions:[
   ['fixed','unchanging',['correctly pronounced','scientifically measured','difficult to translate'],'The opening contrasts a single unchanging meaning with several meanings.','Studied vocabulary in a new context'],
   ['cell','a small room for a prisoner',['a unit that produces electricity','a basic unit of a living organism','a box for entering spreadsheet data'],'The question specifies the prison example, where cell refers to the room used to keep a prisoner.','Verified meanings of cell','in the prison example'],
   ['cell','a basic structural and functional unit of life',['a small room for a prisoner','a radio coverage area','a box for entering spreadsheet data'],'In the biology example, cell means a basic unit of life, not a room or a network area.','Verified meanings of cell','in the biology example'],
   ['cell','a unit that generates electricity through chemical reactions',['a radio coverage area','a small room used for storage','a box for entering spreadsheet data'],'The electrical example describes the unit producing electrical energy through chemical reactions.','Verified meanings of cell','in the electrical-device example'],
   ['cell','a box for entering data or a formula',['a group of linked radio towers','a basic unit of a living organism','a room where a prisoner is kept'],'The spreadsheet example explicitly describes an individual data-entry box.','Verified meanings of cell','in the spreadsheet example'],
   ['intersection','place where two things cross',['space between two separate objects','series arranged by size','boundary enclosing an object'],'A spreadsheet cell lies where its row and column cross.','Microsoft cell-reference explanation'],
   ['analogous','similar in a particular way',['identical in every detail','different in every respect','unrelated in origin and purpose'],'The passage identifies one shared feature but also emphasizes important differences.','IMG_2336.JPG: analogy word family'],
   ['function','role or purpose',['physical size','historical origin','rate of change'],'The sentence compares what an electrical cell does with the purpose of a prison room.','Studied academic vocabulary'],
   ['context','surrounding words and situation',['earliest meaning of a word','number of letters in a word','speaker\'s preferred pronunciation'],'Microscope, guard, voltage and formula help identify which meaning fits.','Studied reading vocabulary'],
   ['precise','exact and specific',['unusually short','widely accepted','easy to remember'],'A precise interpretation identifies the exact meaning required in that situation.','IMG_2348.JPG: precise']
  ]
 },
 {
  title:'Perception and the Evidence We Notice',kind:'perception',
  paragraphs:[
   '<u>Perception</u> involves more than receiving signals through the senses. A person must also select information and decide what it means. This process can be <u>selective</u>: a reader concentrating on a difficult paragraph may give little attention to a conversation nearby. The example concerns attention, not a claim that the reader has damaged hearing.',
   'Imagine a classroom demonstration. Two listeners try to identify a faint tone among other sounds. Their <u>prior</u> experience may shape what they expect to hear. One listener reports a tone whenever the evidence is uncertain. The other waits for a clearer signal. The first listener may report more real tones, but may also report tones that were never played. A count of correct detections alone would not be a <u>valid</u> measure of which listener hears better.',
   'To <u>distinguish</u> sensory ability from willingness to say yes, the class must consider both kinds of response. It should <u>contrast</u> successful detections with false alarms. This comparison reveals a possible response <u>bias</u>, or systematic tendency to favor one answer, rather than simply treating every confident reply as proof.',
   'The demonstration illustrates why careful explanations must <u>specify</u> what was measured. A result may support a <u>tentative</u> conclusion without settling every question. An appropriate research <u>philosophy</u> is to compare explanations with evidence and revise an interpretation when better evidence becomes available.'
  ],
  questions:[
   ['Perception','the process of interpreting sensory information',['the ability to remember every detail','the act of producing a physical signal','the process of repairing damaged hearing'],'The opening explains that receiving signals must be followed by selection and interpretation.','Shared perception reading theme'],
   ['selective','focused on some things rather than all',['equally sensitive to every signal','independent of the surrounding task','unable to receive any information'],'The reader focuses on the paragraph while giving little attention to nearby speech.','Shared perception reading theme'],
   ['prior','earlier',['unrelated','unusual','shared'],'Prior experience is experience from before the demonstration.','Shared reading and vocabulary material'],
   ['valid','well-founded for the purpose',['easy to repeat aloud','popular with the listeners','likely to produce a high number'],'Counting successful detections alone does not justify a comparison of hearing ability.','IMG_2352.JPG: valid (ticked)'],
   ['distinguish','tell apart',['bring together','make stronger','describe in public'],'The class needs to separate sensory ability from a tendency to answer yes.','Shared perception reading theme'],
   ['contrast','compare to identify differences',['combine into a single total','repeat under identical conditions','replace with a simpler example'],'Successful detections and false alarms must be compared as different outcomes.','Shared reading and vocabulary material'],
   ['bias','systematic preference for one response',['accidental failure of the equipment','complete absence of sensory input','accurate memory of an earlier event'],'The passage defines the bias as favoring an answer, such as saying yes when uncertain.','Shared perception reading theme'],
   ['specify','state exactly',['leave undecided','treat as unimportant','explain in advance why something failed'],'An explanation should state exactly what the demonstration measured.','Shared vocabulary material'],
   ['tentative','not yet certain or final',['already proved beyond doubt','impossible to investigate','unrelated to the question'],'The conclusion has some support but does not settle every question.','Shared vocabulary material'],
   ['philosophy','set of guiding principles',['collection of measuring instruments','record of individual responses','fixed sequence of laboratory movements'],'Here research philosophy means the principles guiding how explanations are judged and revised.','IMG_2348.JPG: philosophy (ticked)']
  ]
 },
 {
  title:'What a Space Rock Can Tell Us',kind:'meteorites',
  paragraphs:[
   'Meteorites are <u>fragments</u> of material from space that survive the journey through the atmosphere and reach the ground. Many come from asteroids. Their <u>composition</u> can help researchers investigate their <u>origin</u>. A useful comparison considers the minerals in a sample alongside other evidence; outward resemblance alone is not enough.',
   'A meteorite can <u>undergo</u> changes after reaching Earth. Moisture and other conditions can <u>alter</u> its surface, producing weathering that damages some clues to its earlier history. Researchers therefore try to <u>preserve</u> samples carefully. The location and circumstances of a discovery are also <u>relevant</u>, because they help explain what may have happened to the specimen.',
   'Now consider a hypothetical collection. If one kind of fragment is easier to recognize, that kind may be found more often. A collection dominated by it would not necessarily be <u>representative</u> of all the material that originally arrived. It would be misleading to infer original proportions simply from the number of objects on display.',
   'Researchers must make any <u>inference</u> with these limits in mind. They can test an interpretation against chemical measurements and <u>subsequent</u> observations. An incomplete specimen can still provide valuable evidence, but a strong explanation considers what the evidence does not show as carefully as what it does.'
  ],
  questions:[
   ['fragments','pieces of a larger object',['layers forming inside an object','instruments used to measure an object','copies made from an original object'],'The passage discusses smaller pieces of space material.','Shared materials and meteorite reading theme'],
   ['composition','the materials something is made of',['the place where something is found','the time something takes to move','the method used to display something'],'Minerals and other components reveal what a meteorite consists of.','Shared materials and meteorite reading theme'],
   ['origin','where something came from',['what something weighs now','how something is displayed','when something was last measured'],'The scientists investigate the source of the meteorite.','Shared materials and meteorite reading theme'],
   ['undergo','experience',['prevent','predict','complete deliberately'],'A meteorite experiences changes after it reaches Earth.','IMG_2352.JPG: undergo'],
   ['alter','change',['compare','identify','collect'],'Weathering changes the surface rather than merely locating or measuring it.','Shared materials reading theme'],
   ['preserve','protect from damage or loss',['sort into equal groups','make more widely available','estimate the original size of'],'Careful storage protects the sample and its evidence from further damage.','Shared reading and vocabulary material'],
   ['relevant','connected to the matter being studied',['available only to specialists','accurate to the nearest unit','more recent than every other example'],'Discovery circumstances matter because they help explain changes to the specimen.','Shared reading and vocabulary material'],
   ['representative','typical of the larger group',['more valuable than the rest','easy to identify by sight','collected at the same time'],'A sample biased toward easy-to-find objects may not reflect the wider group.','Shared reading and vocabulary material'],
   ['inference','conclusion drawn from evidence',['measurement recorded by an instrument','mistake caused by poor storage','description copied from a display label'],'An inference is the interpretation researchers draw from the clues.','Shared reading and vocabulary material'],
   ['subsequent','later',['independent','contradictory','incomplete'],'These observations occur after the earlier measurements or interpretation.','Shared reading and vocabulary material']
  ]
 },
 {
  title:'Reading a Journey Through Different Eyes',kind:'travel',
  paragraphs:[
   'Consider a historian who plans to <u>undertake</u> a study of an old journey. Two travelers left accounts of the same route, but one describes business arrangements while the other records daily life. Each account offers a <u>unique</u> contribution: something not provided in quite the same way by the other. Neither should automatically be treated as a complete record.',
   'The travelers may describe the same <u>vehicle</u> differently. A passenger interested in comfort might discuss the seats, while a merchant concentrates on the space for goods. Their purposes help explain which features receive <u>emphasis</u>. A historian should not <u>presume</u> that every difference is an error; people can notice different details without inventing them.',
   'However, a sensible explanation is not automatically a <u>reliable</u> one. Dates, maps and other records should be used to check the accounts. A <u>preliminary</u> comparison can reveal questions that deserve further investigation. If a writer could not <u>predict</u> a later event, a detailed description of that event may suggest that the account was revised afterward. This is a possible clue, not proof by itself.',
   'The historian then examines a larger <u>range</u> of sources. Each has strengths and limitations, and a cautious <u>revision</u> of the first interpretation may be needed. Understanding a journey requires more than selecting the most entertaining story: it requires asking who wrote each account, for whom, when, and for what purpose.'
  ],
  questions:[
   ['undertake','begin and take responsibility for',['bring to an immediate end','provide money for someone else to do','describe without becoming involved in'],'The historian plans to carry out and take responsibility for the study.','IMG_2352.JPG: undertake'],
   ['unique','not provided by another in the same way',['more accurate than every alternative','suitable for every reader','written much later than expected'],'Each account contributes a feature that the other does not supply in quite the same way.','IMG_2352.JPG: unique (ticked)'],
   ['vehicle','means of transport',['place where travelers stay','container used to store records','person responsible for guiding a group'],'Passengers and merchants describe features of the same means of transport.','IMG_2352.JPG: vehicle (ticked)'],
   ['emphasis','special attention or importance',['financial cost of an activity','sequence in which events happened','distance between two places'],'A writer gives special attention to details connected with the purpose of the journey.','Shared travel reading and vocabulary theme'],
   ['presume','assume without sufficient checking',['discover through repeated measurement','explain using several independent sources','record at the time an event occurs'],'The historian should not assume, without checking, that every difference is a mistake.','IMG_2348.JPG: presume'],
   ['reliable','worthy of trust',['easy to distribute','detailed in every respect','interesting to a wide audience'],'An explanation must be checked before it can be trusted, even if it sounds sensible.','Shared vocabulary and reading material'],
   ['preliminary','initial and preparatory',['complete and conclusive','unrelated to the main question','based only on numerical data'],'The first comparison prepares the way for further investigation.','IMG_2348.JPG: preliminary'],
   ['predict','foresee or say in advance',['remember with complete accuracy','explain in a different language','record after checking the evidence'],'A writer at an earlier time could not necessarily foresee a later event.','IMG_2348.JPG: predict (ticked)'],
   ['range','variety or extent',['exact date of completion','degree of personal agreement','physical condition of a document'],'The historian consults a wider variety of sources.','Shared travel reading and vocabulary theme'],
   ['revision','change made after reconsideration',['summary copied from another writer','division into equal sections','repetition without any alteration'],'New evidence may require the historian to change the first interpretation.','Shared vocabulary and reading material']
  ]
 }
];
let seed=20261125;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let n=50;
for(const [p,passage] of passages.entries())passage.questions=passage.questions.map(([word,answer,distractors,reason,source,scope])=>{
 const options=[answer,...distractors];for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
 n++;return {n,id:'v'+n,word,text:`In "${passage.title}", <u>${word}</u>${scope?' '+scope:''} is closest in meaning to:`,options,key:options.indexOf(answer),explanation:reason,source,passageTitle:passage.title,passage:passage.paragraphs.join('\n\n').replace(/<[^>]*>/g,'')};
});
module.exports={passages,sources,questions:passages.flatMap(p=>p.questions)};
