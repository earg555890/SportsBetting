// =============================================================================
// MOCK DATA
// In-memory data for every league. Used when no backend is connected, and as
// a fallback when ESPN mode is OFF. Each league has: teams, players, matches,
// news, leaders. UFC and Boxing have a fights array instead of matches.
// =============================================================================

const mockData = {
  nhl: {
    league:'NHL', sport:'hockey',
    teams: {col:{name:'Avalanche', short:'COL', color:'#6F263D', record:'48-22-6', pts:102}, edm:{name:'Oilers', short:'EDM', color:'#FF4C00', record:'46-23-7', pts:99}, bos:{name:'Bruins', short:'BOS', color:'#FFB81C', record:'45-22-9', pts:99}, fla:{name:'Panthers', short:'FLA', color:'#C8102E', record:'47-23-6', pts:100}, nyr:{name:'Rangers', short:'NYR', color:'#0038A8', record:'46-22-7', pts:99}, dal:{name:'Stars', short:'DAL', color:'#006847', record:'45-21-8', pts:98}},
    players: {
      mac:{id:'mac', name:'Nathan MacKinnon', team:'col', pos:'C', num:29, color:'#6F263D', stats:{G:38,A:74,Pts:112,'+/-':22}, role:'center', hot:true},
      mak:{id:'mak', name:'Cale Makar', team:'col', pos:'D', num:8, color:'#6F263D', stats:{G:18,A:62,Pts:80,'+/-':18}, role:'def-rush'},
      mcd:{id:'mcd', name:'Connor McDavid', team:'edm', pos:'C', num:97, color:'#FF4C00', stats:{G:31,A:81,Pts:112,'+/-':15}, role:'center', hot:true},
      drs:{id:'drs', name:'Leon Draisaitl', team:'edm', pos:'C', num:29, color:'#FF4C00', stats:{G:35,A:65,Pts:100,'+/-':12}, role:'center'},
      pas:{id:'pas', name:'David Pastrnak', team:'bos', pos:'RW', num:88, color:'#FFB81C', stats:{G:44,A:51,Pts:95,'+/-':18}, role:'right-wing'},
      tka:{id:'tka', name:'Matthew Tkachuk', team:'fla', pos:'LW', num:19, color:'#C8102E', stats:{G:25,A:55,Pts:80,'+/-':12}, role:'left-wing'}
    },
    goalies: {
      geo:{id:'geo', name:'Alexandar Georgiev', team:'col', num:40, color:'#6F263D', stats:{'SV%':'.897','GAA':'2.94','W':35,'SO':2}, zones:{topL:0.62, topC:0.75, topR:0.65, midL:0.72, midC:0.82, midR:0.70, lowL:0.45, lowC:0.60, lowR:0.50}},
      sko2:{id:'sko2', name:'Stuart Skinner', team:'edm', num:74, color:'#FF4C00', stats:{'SV%':'.905','GAA':'2.62','W':32,'SO':3}, zones:{topL:0.65, topC:0.78, topR:0.68, midL:0.75, midC:0.88, midR:0.72, lowL:0.50, lowC:0.65, lowR:0.55}},
      bob:{id:'bob', name:'Sergei Bobrovsky', team:'fla', num:72, color:'#C8102E', stats:{'SV%':'.928','GAA':'2.21','W':36,'SO':6}, zones:{topL:0.78, topC:0.92, topR:0.74, midL:0.85, midC:0.95, midR:0.83, lowL:0.65, lowC:0.72, lowR:0.62}}
    },
    matches: [
      {home:'col', away:'edm', status:'LIVE', time:'P2 12:34', hs:2, as:1, odds:{w:56,l:44}, isFeature:true,
        books:{kalshi:{w:55,l:45}, fanduel:{w:57,l:43}, draftkings:{w:56,l:44}},
        homeGoalie:'geo', awayGoalie:'sko2', featuredSkaters:['mac','mak','mcd','drs'],
        powerPlays:[{team:'col', period:1, start:8, length:120, result:'goal'},{team:'edm', period:1, start:14, length:120, result:'killed'},{team:'col', period:2, start:3, length:90, result:'killed'},{team:'edm', period:2, start:9, length:120, result:'goal'}],
        faceoffs:[{x:255, y:45, winner:'home'},{x:255, y:115, winner:'away'},{x:65, y:45, winner:'home'},{x:65, y:115, winner:'home'},{x:160, y:80, winner:'away'},{x:255, y:45, winner:'home'},{x:65, y:115, winner:'away'},{x:160, y:80, winner:'home'},{x:255, y:115, winner:'home'},{x:65, y:45, winner:'away'},{x:160, y:80, winner:'home'},{x:255, y:115, winner:'home'}],
        shifts: {mac:{p1:[[1,5],[8,12],[15,19]], p2:[[1,4],[7,11],[14,18]], p3:[[2,6],[9,13],[16,19]]}, mcd:{p1:[[2,6],[9,13],[16,20]], p2:[[2,5],[8,12],[15,19]], p3:[[1,5],[8,12],[15,19]]}, mak:{p1:[[3,7],[10,14],[17,20]], p2:[[2,6],[9,13],[16,20]], p3:[[3,7],[10,14],[17,20]]}, drs:{p1:[[1,5],[8,11],[14,18]], p2:[[1,4],[7,10],[13,17]], p3:[[2,5],[8,12],[15,19]]}}},
      {home:'bos', away:'fla', status:'UPCOMING', time:'7:00 PM', hs:null, as:null, odds:{w:48,l:52}, books:{kalshi:{w:47,l:53}, fanduel:{w:49,l:51}, draftkings:{w:48,l:52}}},
      {home:'nyr', away:'dal', status:'UPCOMING', time:'8:00 PM', hs:null, as:null, odds:{w:52,l:48}, books:{kalshi:{w:51,l:49}, fanduel:{w:53,l:47}, draftkings:{w:52,l:48}}}
    ],
    news: [{tag:'INJURY', sev:'warning', text:'McDavid day-to-day with lower-body', when:'1h'},{tag:'NEWS', sev:'info', text:'MacKinnon hits 100-point mark', when:'4h'},{tag:'NEWS', sev:'info', text:'Bobrovsky named Vezina finalist', when:'1d'}],
    leaders: [{title:'Goals', value:44, name:'Pastrnak'},{title:'Assists', value:81, name:'McDavid'},{title:'Points', value:112, name:'MacKinnon'},{title:'SV%', value:'.928', name:'Bobrovsky'}]
  },
  nba: {
    league:'NBA', sport:'basketball',
    teams: {bos_cel:{name:'Celtics', short:'BOS', color:'#007A33', record:'58-18', pts:'.763'}, den:{name:'Nuggets', short:'DEN', color:'#0E2240', record:'52-24', pts:'.684'}, mil:{name:'Bucks', short:'MIL', color:'#00471B', record:'50-26', pts:'.658'}, lal:{name:'Lakers', short:'LAL', color:'#552583', record:'42-34', pts:'.553'}, gsw:{name:'Warriors', short:'GSW', color:'#1D428A', record:'40-36', pts:'.526'}, nyk:{name:'Knicks', short:'NYK', color:'#F58426', record:'46-30', pts:'.605'}},
    players: {
      p_tat:{id:'p_tat', name:'Jayson Tatum', team:'bos_cel', pos:'SF', num:0, color:'#007A33', stats:{PPG:27.4,RPG:8.1,APG:4.9,'FG%':47.1}, hot:true, shotZone:'wing'},
      p_jok:{id:'p_jok', name:'Nikola Jokic', team:'den', pos:'C', num:15, color:'#0E2240', stats:{PPG:26.8,RPG:12.3,APG:9.1,'FG%':58.3}, hot:true, shotZone:'paint'},
      p_gia:{id:'p_gia', name:'Giannis Antetokounmpo', team:'mil', pos:'PF', num:34, color:'#00471B', stats:{PPG:30.4,RPG:11.5,APG:6.5,'FG%':61.2}, hot:true, shotZone:'paint'},
      p_lbj:{id:'p_lbj', name:'LeBron James', team:'lal', pos:'SF', num:23, color:'#552583', stats:{PPG:25.7,RPG:7.3,APG:8.3,'FG%':54.0}, shotZone:'midrange'},
      p_cur:{id:'p_cur', name:'Stephen Curry', team:'gsw', pos:'PG', num:30, color:'#1D428A', stats:{PPG:26.4,RPG:4.5,APG:5.1,'FG%':45.0}, shotZone:'three'},
      p_bru:{id:'p_bru', name:'Jalen Brunson', team:'nyk', pos:'PG', num:11, color:'#F58426', stats:{PPG:28.7,RPG:3.6,APG:6.7,'FG%':47.9}, shotZone:'midrange'}
    },
    matches: [
      {home:'bos_cel', away:'mil', status:'LIVE', time:'Q3 4:22', hs:78, as:71, odds:{w:68,l:32}, isFeature:true, books:{kalshi:{w:66,l:34}, fanduel:{w:69,l:31}, draftkings:{w:68,l:32}}, line:'BOS -3.5'},
      {home:'den', away:'lal', status:'LIVE', time:'Q2 8:14', hs:54, as:48, odds:{w:74,l:26}, books:{kalshi:{w:72,l:28}, fanduel:{w:75,l:25}, draftkings:{w:74,l:26}}},
      {home:'gsw', away:'nyk', status:'UPCOMING', time:'Tonight 10:30', hs:null, as:null, odds:{w:42,l:58}, books:{kalshi:{w:43,l:57}, fanduel:{w:41,l:59}, draftkings:{w:42,l:58}}}
    ],
    news: [{tag:'INJURY', sev:'warning', text:'Tatum questionable for Game 4 (ankle)', when:'12m'},{tag:'NEWS', sev:'info', text:'Jokic clinches third MVP nod', when:'2h'}],
    leaders: [{title:'PPG', value:'33.4', name:'Doncic'},{title:'RPG', value:'14.2', name:'Sabonis'},{title:'APG', value:'10.9', name:'Haliburton'},{title:'BPG', value:'2.4', name:'Wemby'}]
  },
  wnba: {
    league:'WNBA', sport:'basketball',
    teams: {ind:{name:'Fever', short:'IND', color:'#FFB81C', record:'19-13', pts:'.594'}, lvs:{name:'Aces', short:'LVS', color:'#C8102E', record:'24-8', pts:'.750'}, nyl:{name:'Liberty', short:'NYL', color:'#86CEBC', record:'22-10', pts:'.688'}, min:{name:'Lynx', short:'MIN', color:'#236192', record:'21-11', pts:'.656'}},
    players: {
      p_cla:{id:'p_cla', name:'Caitlin Clark', team:'ind', pos:'PG', num:22, color:'#FFB81C', stats:{PPG:19.2,RPG:5.7,APG:8.4,'FG%':41.7}, hot:true, shotZone:'three'},
      p_wil:{id:'p_wil', name:"A'ja Wilson", team:'lvs', pos:'F', num:22, color:'#C8102E', stats:{PPG:27.3,RPG:11.9,APG:2.3,'FG%':51.8}, hot:true, shotZone:'paint'},
      p_sto:{id:'p_sto', name:'Breanna Stewart', team:'nyl', pos:'F', num:30, color:'#86CEBC', stats:{PPG:20.4,RPG:8.5,APG:3.5,'FG%':46.1}, shotZone:'wing'}
    },
    matches: [{home:'lvs', away:'nyl', status:'UPCOMING', time:'Tonight 8:00', hs:null, as:null, odds:{w:54,l:46}, isFeature:true, books:{kalshi:{w:53,l:47}, fanduel:{w:55,l:45}, draftkings:{w:54,l:46}}}],
    news: [{tag:'NEWS', sev:'info', text:'Clark named All-Star Game starter', when:'1h'}],
    leaders: [{title:'PPG', value:'27.3', name:'Wilson'},{title:'APG', value:'8.4', name:'Clark'},{title:'RPG', value:'11.9', name:'Wilson'},{title:'3PM', value:'3.4', name:'Clark'}]
  },
  ncaam: {
    league:'NCAA Men', sport:'basketball',
    teams: {uconn:{name:'UConn', short:'UCN', color:'#000E2F', record:'28-3', pts:'.903'}, pur:{name:'Purdue', short:'PUR', color:'#CEB888', record:'27-4', pts:'.871'}, hou:{name:'Houston', short:'HOU', color:'#C8102E', record:'27-4', pts:'.871'}},
    players: {
      p_ed:{id:'p_ed', name:'Zach Edey', team:'pur', pos:'C', num:15, color:'#CEB888', stats:{PPG:24.7,RPG:12.2,APG:2.2,'FG%':62.3}, hot:true, shotZone:'paint'}
    },
    matches: [{home:'uconn', away:'pur', status:'UPCOMING', time:'Mon 9:20 PM', hs:null, as:null, odds:{w:54,l:46}, isFeature:true, books:{kalshi:{w:53,l:47}, fanduel:{w:55,l:45}, draftkings:{w:54,l:46}}, line:'UCN -2.5'}],
    news: [{tag:'NEWS', sev:'info', text:'March Madness bracket revealed', when:'1h'}],
    leaders: [{title:'PPG', value:'24.7', name:'Edey'},{title:'RPG', value:'12.2', name:'Edey'},{title:'APG', value:'7.2', name:'Sears'},{title:'3PM', value:'4.1', name:'Davis'}]
  },
  nfl: {
    league:'NFL', sport:'football',
    teams: {kc:{name:'Chiefs', short:'KC', color:'#E31837', record:'12-3', pts:'.800'}, buf:{name:'Bills', short:'BUF', color:'#00338D', record:'11-4', pts:'.733'}, sf:{name:'49ers', short:'SF', color:'#AA0000', record:'10-5', pts:'.667'}, phi_eag:{name:'Eagles', short:'PHI', color:'#004C54', record:'11-4', pts:'.733'}, bal:{name:'Ravens', short:'BAL', color:'#241773', record:'12-3', pts:'.800'}},
    players: {
      p_mah:{id:'p_mah', name:'Patrick Mahomes', team:'kc', pos:'QB', num:15, color:'#E31837', stats:{'Pass Yds':4183,'Pass TD':27,'Int':14,'Rating':92.6}, hot:true, passStyle:'balanced'},
      p_all:{id:'p_all', name:'Josh Allen', team:'buf', pos:'QB', num:17, color:'#00338D', stats:{'Pass Yds':3947,'Pass TD':29,'Int':18,'Rating':92.2}, passStyle:'deep'},
      p_pur:{id:'p_pur', name:'Brock Purdy', team:'sf', pos:'QB', num:13, color:'#AA0000', stats:{'Pass Yds':4280,'Pass TD':31,'Int':11,'Rating':113.0}, hot:true, passStyle:'short'},
      p_hur:{id:'p_hur', name:'Jalen Hurts', team:'phi_eag', pos:'QB', num:1, color:'#004C54', stats:{'Pass Yds':3858,'Pass TD':23,'Int':15,'Rating':89.1}, passStyle:'short'},
      p_jac:{id:'p_jac', name:'Lamar Jackson', team:'bal', pos:'QB', num:8, color:'#241773', stats:{'Pass Yds':3678,'Pass TD':24,'Int':7,'Rating':102.7}, hot:true, passStyle:'balanced'}
    },
    matches: [
      {home:'kc', away:'buf', status:'UPCOMING', time:'Sun 4:25 PM', hs:null, as:null, odds:{w:54,l:46}, isFeature:true, books:{kalshi:{w:53,l:47}, fanduel:{w:55,l:45}, draftkings:{w:54,l:46}}, line:'KC -2.5'},
      {home:'phi_eag', away:'sf', status:'UPCOMING', time:'Sun 1:00 PM', hs:null, as:null, odds:{w:51,l:49}, books:{kalshi:{w:50,l:50}, fanduel:{w:52,l:48}, draftkings:{w:51,l:49}}, line:'PHI -1'},
      {home:'bal', away:'kc', status:'FINAL', time:'FT', hs:24, as:31, odds:{w:35,l:65}, books:{kalshi:{w:36,l:64}, fanduel:{w:34,l:66}, draftkings:{w:35,l:65}}}
    ],
    news: [{tag:'INJURY', sev:'danger', text:'Hurts limited in practice (knee)', when:'2h'},{tag:'NEWS', sev:'info', text:'Chiefs clinch AFC West', when:'6h'}],
    leaders: [{title:'Pass Yds', value:'4,820', name:'Burrow'},{title:'Pass TD', value:39, name:'Allen'},{title:'Rush Yds', value:'1,420', name:'Henry'},{title:'Sacks', value:18, name:'Garrett'}]
  },
  ncaafb: {
    league:'NCAA FB', sport:'football',
    teams: {mich:{name:'Michigan', short:'MICH', color:'#FFCB05', record:'13-0', pts:'1.000'}, wash:{name:'Washington', short:'WASH', color:'#4B2E83', record:'12-1', pts:'.923'}, tex:{name:'Texas', short:'TEX', color:'#BF5700', record:'12-1', pts:'.923'}},
    players: {
      p_pen2:{id:'p_pen2', name:'Michael Penix Jr.', team:'wash', pos:'QB', num:9, color:'#4B2E83', stats:{'Pass Yds':4218,'Pass TD':33,'Int':10,'Rating':166.0}, hot:true, passStyle:'deep'}
    },
    matches: [{home:'mich', away:'wash', status:'UPCOMING', time:'Mon 7:30 PM', hs:null, as:null, odds:{w:51,l:49}, isFeature:true, books:{kalshi:{w:50,l:50}, fanduel:{w:52,l:48}, draftkings:{w:51,l:49}}, line:'MICH -4'}],
    news: [{tag:'NEWS', sev:'info', text:'CFP committee announces final rankings', when:'2h'}],
    leaders: [{title:'Pass Yds', value:'4,218', name:'Penix'},{title:'Pass TD', value:33, name:'Penix'},{title:'Rush Yds', value:'1,889', name:'Daniels'},{title:'Sacks', value:14, name:'Latu'}]
  },
  mlb: {
    league:'MLB', sport:'baseball',
    teams: {lad:{name:'Dodgers', short:'LAD', color:'#005A9C', record:'88-54', pts:'.620'}, nyy:{name:'Yankees', short:'NYY', color:'#0C2340', record:'82-60', pts:'.577'}, phi_phi:{name:'Phillies', short:'PHI', color:'#E81828', record:'84-58', pts:'.592'}, atl:{name:'Braves', short:'ATL', color:'#CE1141', record:'85-57', pts:'.599'}},
    players: {
      p_oht:{id:'p_oht', name:'Shohei Ohtani', team:'lad', pos:'DH', num:17, color:'#005A9C', stats:{AVG:'.310',HR:48,RBI:99,OPS:'1.036'}, hot:true, sprayStyle:'pull'},
      p_jud:{id:'p_jud', name:'Aaron Judge', team:'nyy', pos:'OF', num:99, color:'#0C2340', stats:{AVG:'.301',HR:53,RBI:114,OPS:'1.124'}, hot:true, sprayStyle:'pull'},
      p_har:{id:'p_har', name:'Bryce Harper', team:'phi_phi', pos:'1B', num:3, color:'#E81828', stats:{AVG:'.281',HR:30,RBI:87,OPS:'.901'}, sprayStyle:'all'},
      p_acu:{id:'p_acu', name:'Ronald Acuña Jr.', team:'atl', pos:'OF', num:13, color:'#CE1141', stats:{AVG:'.288',HR:29,RBI:78,OPS:'.918'}, sprayStyle:'all'}
    },
    matches: [
      {home:'lad', away:'nyy', status:'LIVE', time:'Top 6th', hs:4, as:3, odds:{w:58,l:42}, isFeature:true, books:{kalshi:{w:57,l:43}, fanduel:{w:59,l:41}, draftkings:{w:58,l:42}}},
      {home:'phi_phi', away:'atl', status:'LIVE', time:'Bot 4th', hs:2, as:1, odds:{w:55,l:45}, books:{kalshi:{w:54,l:46}, fanduel:{w:56,l:44}, draftkings:{w:55,l:45}}}
    ],
    news: [{tag:'INJURY', sev:'warning', text:'Ohtani placed on 10-day IL (elbow)', when:'3h'}],
    leaders: [{title:'AVG', value:'.331', name:'Arraez'},{title:'HR', value:53, name:'Judge'},{title:'RBI', value:114, name:'Judge'},{title:'ERA', value:'2.41', name:'Skubal'}]
  },
  epl: {
    league:'EPL', sport:'soccer',
    teams: {mci:{name:'Man City', short:'MCI', color:'#6CABDD', record:'24-6-3', pts:78}, ars:{name:'Arsenal', short:'ARS', color:'#EF0107', record:'23-5-5', pts:74}, liv:{name:'Liverpool', short:'LIV', color:'#C8102E', record:'22-7-4', pts:73}, che:{name:'Chelsea', short:'CHE', color:'#034694', record:'17-9-7', pts:60}},
    players: {
      p_haa:{id:'p_haa', name:'Erling Haaland', team:'mci', pos:'ST', num:9, color:'#6CABDD', stats:{Goals:22,Assists:5,xG:19.4,Mins:2410}, zone:'box', hot:true},
      p_sak:{id:'p_sak', name:'Bukayo Saka', team:'ars', pos:'RW', num:7, color:'#EF0107', stats:{Goals:14,Assists:11,xG:11.2,Mins:2580}, zone:'rightWing'},
      p_sal:{id:'p_sal', name:'Mohamed Salah', team:'liv', pos:'RW', num:11, color:'#C8102E', stats:{Goals:18,Assists:9,xG:15.8,Mins:2620}, zone:'rightWing'},
      p_pal:{id:'p_pal', name:'Cole Palmer', team:'che', pos:'AM', num:20, color:'#034694', stats:{Goals:16,Assists:9,xG:13.2,Mins:2510}, zone:'centerAtt'}
    },
    matches: [
      {home:'mci', away:'ars', status:'LIVE', time:"67'", hs:1, as:1, odds:{w:62,d:22,l:16}, isFeature:true, books:{kalshi:{w:60,d:23,l:17}, fanduel:{w:63,d:21,l:16}, draftkings:{w:62,d:22,l:16}}},
      {home:'liv', away:'che', status:'LIVE', time:"42'", hs:2, as:0, odds:{w:71,d:18,l:11}, books:{kalshi:{w:73,d:17,l:10}, fanduel:{w:70,d:18,l:12}, draftkings:{w:71,d:18,l:11}}}
    ],
    news: [{tag:'INJURY', sev:'warning', text:'Saka sidelined 2 weeks (hamstring)', when:'15m'},{tag:'NEWS', sev:'info', text:'Pep signs new two-year contract', when:'5h'}],
    leaders: [{title:'Goals', value:22, name:'Haaland'},{title:'Assists', value:11, name:'Saka'},{title:'xG', value:'19.4', name:'Haaland'},{title:'Cleans', value:14, name:'Alisson'}]
  },
  mls: {
    league:'MLS', sport:'soccer',
    teams: {mia:{name:'Inter Miami', short:'MIA', color:'#F7B5CD', record:'19-4-7', pts:64}, cin:{name:'FC Cincinnati', short:'CIN', color:'#FF6600', record:'17-6-7', pts:58}, col:{name:'Columbus', short:'CLB', color:'#FFD700', record:'16-7-7', pts:55}},
    players: {
      p_msi:{id:'p_msi', name:'Lionel Messi', team:'mia', pos:'AM', num:10, color:'#F7B5CD', stats:{Goals:18,Assists:14,xG:15.4,Mins:2280}, zone:'centerAtt', hot:true},
      p_aco:{id:'p_aco', name:'Luciano Acosta', team:'cin', pos:'AM', num:10, color:'#FF6600', stats:{Goals:11,Assists:9,xG:9.7,Mins:2380}, zone:'centerAtt'}
    },
    matches: [{home:'mia', away:'cin', status:'UPCOMING', time:'Sat 7:30 PM', hs:null, as:null, odds:{w:52,d:23,l:25}, isFeature:true, books:{kalshi:{w:51,d:24,l:25}, fanduel:{w:53,d:22,l:25}, draftkings:{w:52,d:23,l:25}}}],
    news: [{tag:'NEWS', sev:'info', text:'Messi named MLS MVP for second straight year', when:'1h'}],
    leaders: [{title:'Goals', value:18, name:'Messi'},{title:'Assists', value:14, name:'Messi'},{title:'xG', value:'15.4', name:'Messi'},{title:'Saves', value:91, name:'Romero'}]
  },
  laliga: {
    league:'La Liga', sport:'soccer',
    teams: {rma:{name:'Real Madrid', short:'RMA', color:'#FEBE10', record:'26-4-3', pts:82}, bar:{name:'Barcelona', short:'BAR', color:'#A50044', record:'24-5-4', pts:77}, atm:{name:'Atletico', short:'ATM', color:'#CB3524', record:'21-7-5', pts:70}},
    players: {
      p_mba:{id:'p_mba', name:'Kylian Mbappé', team:'rma', pos:'ST', num:9, color:'#FEBE10', stats:{Goals:24,Assists:7,xG:20.1,Mins:2580}, zone:'box', hot:true},
      p_lew:{id:'p_lew', name:'Robert Lewandowski', team:'bar', pos:'ST', num:9, color:'#A50044', stats:{Goals:21,Assists:4,xG:18.6,Mins:2440}, zone:'box'}
    },
    matches: [{home:'rma', away:'bar', status:'UPCOMING', time:'Sun 16:15', hs:null, as:null, odds:{w:48,d:24,l:28}, isFeature:true, books:{kalshi:{w:47,d:25,l:28}, fanduel:{w:49,d:23,l:28}, draftkings:{w:48,d:24,l:28}}}],
    news: [{tag:'NEWS', sev:'info', text:'Yamal signs contract extension through 2030', when:'2h'}],
    leaders: [{title:'Goals', value:24, name:'Mbappé'},{title:'Assists', value:13, name:'Yamal'},{title:'xG', value:'20.1', name:'Mbappé'},{title:'Cleans', value:12, name:'Courtois'}]
  },
  ucl: {
    league:'UCL', sport:'soccer',
    teams: {rma2:{name:'Real Madrid', short:'RMA', color:'#FEBE10', record:'5-1-0', pts:16}, mci2:{name:'Man City', short:'MCI', color:'#6CABDD', record:'4-2-0', pts:14}, bay:{name:'Bayern', short:'BAY', color:'#DC052D', record:'4-1-1', pts:13}},
    players: {
      p_kan:{id:'p_kan', name:'Harry Kane', team:'bay', pos:'ST', num:9, color:'#DC052D', stats:{Goals:6,Assists:2,xG:6.1,Mins:480}, zone:'box'}
    },
    matches: [{home:'rma2', away:'mci2', status:'UPCOMING', time:'Wed 9:00 PM', hs:null, as:null, odds:{w:42,d:26,l:32}, isFeature:true, books:{kalshi:{w:41,d:27,l:32}, fanduel:{w:43,d:25,l:32}, draftkings:{w:42,d:26,l:32}}}],
    news: [{tag:'NEWS', sev:'info', text:'Quarter-final draw set: Madrid vs City', when:'3h'}],
    leaders: [{title:'Goals', value:8, name:'Mbappé'},{title:'Assists', value:4, name:'Dembélé'},{title:'xG', value:'8.4', name:'Haaland'},{title:'Cleans', value:4, name:'Courtois'}]
  },
  ufc: {
    league:'UFC', sport:'combat',
    fights: [
      {id:'main', label:'MAIN EVENT · Heavyweight Title', rounds:5,
        f1:{name:'Jon Jones', record:'27-1-0', age:37, height:'6\'4"', reach:'84"', stance:'Orthodox', color:'#3672C4',
          strikes:{landed:142, attempted:218, targets:{head:{landed:58, attempted:92}, body:{landed:38, attempted:64}, leg:{landed:46, attempted:62}}, positions:{distance:118, clinch:14, ground:10}},
          zones:{head:0.85, faceR:0.55, faceL:0.45, chest:0.65, ribsR:0.40, ribsL:0.30, absR:0.50, absL:0.55, thighR:0.75, thighL:0.80, calfR:0.30, calfL:0.25, shoulderR:0.20, shoulderL:0.15}},
        f2:{name:'Stipe Miocic', record:'20-4-0', age:42, height:'6\'4"', reach:'80"', stance:'Orthodox', color:'#C8102E',
          strikes:{landed:98, attempted:194, targets:{head:{landed:42, attempted:88}, body:{landed:31, attempted:58}, leg:{landed:25, attempted:48}}, positions:{distance:74, clinch:18, ground:6}},
          zones:{head:0.55, faceR:0.30, faceL:0.40, chest:0.45, ribsR:0.55, ribsL:0.65, absR:0.35, absL:0.30, thighR:0.40, thighL:0.45, calfR:0.20, calfL:0.15, shoulderR:0.30, shoulderL:0.25}},
        odds:{f1:62, f2:38}, books:{kalshi:{f1:60,f2:40},fanduel:{f1:63,f2:37},draftkings:{f1:62,f2:38}}, time:'Sat 11:30 PM ET'},
      {id:'comain', label:'CO-MAIN · Lightweight', rounds:3,
        f1:{name:'Charles Oliveira', record:'34-10-0', age:35, height:'5\'10"', reach:'74"', stance:'Southpaw', color:'#FFD700',
          strikes:{landed:88, attempted:165, targets:{head:{landed:32, attempted:58}, body:{landed:28, attempted:51}, leg:{landed:28, attempted:56}}, positions:{distance:62, clinch:8, ground:18}},
          zones:{head:0.55, faceR:0.40, faceL:0.50, chest:0.55, ribsR:0.45, ribsL:0.55, absR:0.45, absL:0.40, thighR:0.55, thighL:0.65, calfR:0.20, calfL:0.20, shoulderR:0.20, shoulderL:0.25}},
        f2:{name:'Michael Chandler', record:'23-9-0', age:38, height:'5\'8"', reach:'71"', stance:'Southpaw', color:'#0033A0',
          strikes:{landed:74, attempted:148, targets:{head:{landed:38, attempted:72}, body:{landed:18, attempted:38}, leg:{landed:18, attempted:38}}, positions:{distance:58, clinch:10, ground:6}},
          zones:{head:0.65, faceR:0.55, faceL:0.45, chest:0.40, ribsR:0.30, ribsL:0.25, absR:0.30, absL:0.25, thighR:0.35, thighL:0.40, calfR:0.15, calfL:0.20, shoulderR:0.30, shoulderL:0.25}},
        odds:{f1:58, f2:42}, books:{kalshi:{f1:57,f2:43},fanduel:{f1:59,f2:41},draftkings:{f1:58,f2:42}}, time:'Sat 10:30 PM ET'}
    ],
    news: [{tag:'NEWS', sev:'info', text:'Jones-Miocic weigh-ins Friday', when:'4h'},{tag:'INJURY', sev:'warning', text:'Pereira out of co-main', when:'1d'}]
  },
  boxing: {
    league:'Boxing', sport:'combat',
    fights: [
      {id:'main', label:'MAIN · WBA Super Welterweight', rounds:12,
        f1:{name:'Terence Crawford', record:'40-0-0', age:36, height:'5\'8"', reach:'74"', stance:'Southpaw', color:'#000000',
          strikes:{landed:0, attempted:0, targets:{head:{landed:0, attempted:0}, body:{landed:0, attempted:0}, leg:{landed:0, attempted:0}}, positions:{distance:0, clinch:0, ground:0}},
          zones:{head:0.1, faceR:0.1, faceL:0.1, chest:0.1, ribsR:0.1, ribsL:0.1, absR:0.1, absL:0.1, thighR:0, thighL:0, calfR:0, calfL:0, shoulderR:0.1, shoulderL:0.1}},
        f2:{name:'Israil Madrimov', record:'10-0-1', age:29, height:'5\'9"', reach:'72"', stance:'Orthodox', color:'#0033A0',
          strikes:{landed:0, attempted:0, targets:{head:{landed:0, attempted:0}, body:{landed:0, attempted:0}, leg:{landed:0, attempted:0}}, positions:{distance:0, clinch:0, ground:0}},
          zones:{head:0.1, faceR:0.1, faceL:0.1, chest:0.1, ribsR:0.1, ribsL:0.1, absR:0.1, absL:0.1, thighR:0, thighL:0, calfR:0, calfL:0, shoulderR:0.1, shoulderL:0.1}},
        odds:{f1:78, f2:22}, books:{kalshi:{f1:76,f2:24},fanduel:{f1:79,f2:21},draftkings:{f1:78,f2:22}}, time:'Sat 9:00 PM ET'}
    ],
    news: [{tag:'NEWS', sev:'info', text:'Crawford targets 4-division title', when:'3h'}]
  }
};
