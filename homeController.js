define([
    'bcAngular',
    'liveFilter'
], function (bcApp) {
    bcApp.register.controller('homeCtrl', function ($scope, $window, $http, $rootScope, $routeParams, $location, liveExtraSocket, $filter, bcApi, localStorageService) {
        $scope.news = [];
        $scope.load = false;
        $scope.banners = [];
        $scope.sports = [];
        $scope.cntSports = 0;
        $scope.calendar = [];
        $scope.events = [];
        $scope.show_video_live = 0;
        $scope.calendarShow = [];
        $scope.loadingMore = false;
        $scope.countRow = 30;
        $scope.loadingMoreStop = false;
        $scope.lastCalendar = 0;
        $scope.staticDomain = config.staticDomain;
        $scope.empty = false;
        $scope.md = 0;
        $scope.ids_ev = [];
        $scope.lang = config.lang;
        $scope.by = (config.by?true:false);
        $scope.OLD_LINE = !config.access.line;
        $scope.OLD_LIVE = !config.access.liveOpen;
        $scope.buffer = [];
        var video_status_calendar = '';
        var video_status_events = '';
        $rootScope.menu = $scope.menu = 'main';
        $rootScope.menuhide= $scope.menuhide = 1;
        $scope.check_all =  function check_all(form) {
            for (var i = 0; i < document.getElementById(form).length; i++) {
                var e = document.bets.elements[i];
                if (document.bets.elements[0].checked) e.checked = true;
                else e.checked = false;
            }
        }
        var liveExtra = liveExtraSocket.getById('live-bets-main', {chanel:"live"});
        setTimeout(function ()
        {
            $scope.$apply(function()
            {
                $scope.load = true;
            });
        }, 1000);
        $scope.subm_one =  function subm_one(id) {
            document.getElementById(id).checked = true;
            $scope.showLines();
        }

        $scope.subm_all =  function subm_all(form) {
            $scope.check_all(form);
            $scope.showLines();
        }

        $scope.fcheck =  function fcheck(form) {
            for (i = 0; i < form.length; i++) {
                if (form.elements[i].checked == true) return true;
            }
            return false;
        }
        $scope.wopen = function wopen(nid) {
            window.open('#/news/one?id='+nid, '...', 'scrollbars=yes,resizable=no,width=500,height=250');
            return true;
        }

        $scope.prepareDate = function(date){
            return $filter('date')($filter('correctDate')(date), 'dd.MM/HH:mm');
        }

        $scope.prepareDateSoon = function(date, format){
            return $filter('date')($filter('correctDate')(date), format);
        }

        $scope.prepareObject = function(object){
            return object?_.values(object):object;
        }

        /**
         * Метод перенаправляет на страницу с результатом фильтра
         * @returns {boolean}
         */
        $scope.showLines = function(){
            var lines = [];
            var items = angular.element(document).find('.line-item:checked');

            angular.forEach(items, function(item) {
                lines.push(angular.element(item).val());
            });

            if (lines.length == 0) {
                return false;
            }

            setTimeout(function () {
                $scope.$apply(function () {
                    $location.path("/line").search('line_id[]', lines);
                });
            }, 0);
        }

        $scope.loadMore = function() {
            $scope.loadingMore = true;
            if ($scope.calendar !== undefined){
                var lastCalendar = $scope.lastCalendar;
                if (_.size($scope.calendar) - lastCalendar < $scope.countRow){
                    var tmpF = $scope.calendar.slice(lastCalendar, _.size($scope.calendar));
                    $scope.lastCalendar += _.size($scope.calendar);
                }else{
                    var tmpF = $scope.calendar.slice(lastCalendar, lastCalendar + $scope.countRow);
                    $scope.lastCalendar += $scope.countRow;
                }
                if (
                    (_.isEmpty(tmpF) || _.size(tmpF) === 0 || lastCalendar === _.size($scope.calendar)
                        )){
                    $scope.loadingMoreStop = true;
                    $scope.$digest();
                    return false;
                }

                /*for ( var key in Object.keys(tmpF) ){
                    $scope.calendarShow.push(tmpF[key]);
                }*/
                $scope.calendarShow = tmpF;
                setTimeout(function(){ $scope.loadMore(); }, 100);
            }else{
                $scope.loadingMoreStop = true;
            }
            $scope.loadingMore = false;
            $scope.rowsShow = $scope.rows;
            $scope.$digest();
        };

        /**
         * @param data
         */
        $scope.processData = function (data) {
            if (data.ok) {
                setTimeout(function ()
                {
                    $scope.load = false;
                }, 2000);
                $scope.data = data.reply;
                $scope.news = $scope.prepareObject($scope.data.news);
                _.each($scope.news,function(n,i){
                    $scope.news[i].dt_nw = $scope.prepareDate($scope.news[i].dt_nw);
                });
                //$scope.sports = $scope.prepareObject($scope.data.sports);
                //$scope.sports = _.sortBy($scope.sports, function(val){ return val.name_sp });
                $scope.sports = [];
                _.each(_.sortBy($scope.data.sports, 'name_sp'), function(sp){
                    if (_.isArray(config.exclude_sp) && _.indexOf(config.exclude_sp,parseInt(sp.id_sp,10))>=0){
                        return null;
                    }
                    $scope.sports.push(sp);
                    $scope.cntSports += sp.col_sp;
                });

                /*_.each($scope.sports, function(sport){
                    $scope.cntSports += sport.col_sp;
                });*/

                // Banners
                if($scope.data.banners) {
                    $scope.banners = $scope.prepareObject($scope.data.banners);
                    angular.forEach($scope.banners, function (banner, key_banner) {
                        angular.forEach(banner.ids_ch, function (id, key_id) {
                            if(key_id == 0) {
                                $scope.banners[key_banner].ids_ch = '?dop=0&time=1';
                            }
                            $scope.banners[key_banner].ids_ch += '&'+'line_id[]='+id;
                        });
                        $scope.banners[key_banner].img = config.lang==0?banner.img_ru:banner.img_en;
                    });
                }
                //  live
                if($scope.data.events) {
                    var i =0;
                    angular.forEach($scope.data.events.sports, function (sport) {
                        if (_.isArray(config.exclude_sp) && _.indexOf(config.exclude_sp,parseInt(sport.id_sp,10))>=0){
                            return false;
                        }
                        angular.forEach(sport.chmps, function (champ) {
                            angular.forEach(champ.evts, function (event, key_event) {
                                if(event.show_video !==undefined) {
                                    video_status_events = 1;
                                }
                                $scope.events.push({
                                    order: champ.order,
                                    order_ev: event.order,
                                    id_ev:event.id_ev,
                                    id_sp:sport.id_sp,
                                    id_ch:champ.id_ch,
                                    date_ev:event.date_ev,
                                    name_ch:champ.name_ch,
                                    name_ht: (!event.name_ht) ? '' : event.name_ht,
                                    name_at:(!event.name_at) ?'' : ' - '+event.name_at,
                                    name_sp:sport.name_sp,
                                    prev_sp:event.id_ev,
                                    show_video:event.show_video===undefined?0:1
                                });
                            });
                        });
                    });
                    $scope.events = _.values($scope.events);
                    $scope.events = $filter('orderBy')($scope.events, ['name_sp','date_ev','order_ev']);
                    $scope.show_video_live = video_status_events;
                    $scope.md = $scope.data.events.ntime;
                }

                //  livesoon
                if($scope.data.calendar) {
                    var livesoon = [];
                    angular.forEach($scope.data.calendar.sports, function (sport) {
                        if (_.isArray(config.exclude_sp) && _.indexOf(config.exclude_sp,parseInt(sport.id_sp,10))>=0){
                            return false;
                        }
                        angular.forEach(sport.chmps, function (champ) {
                            angular.forEach(champ.evts, function (event) {
                                var date_calendar = $scope.prepareDateSoon(event.date_ev, 'dd.MM.yyyy');
                                var time_calendar = $scope.prepareDateSoon(event.date_ev, 'HH:mm');
                                var date_sort = $filter('correctDate')(event.date_ev);
                                date_sort.setHours(0);
                                date_sort.setMinutes(0);
                                date_sort.setSeconds(0);
                                livesoon.push({
                                    date:date_calendar,
                                    date_sort:date_sort.getTime(),
                                    time:time_calendar,
                                    id_ev:event.id_ev,
                                    order_ev:event.order,
                                    id_ch:champ.id_ch,
                                    date_ev:event.date_ev,
                                    name_ch:champ.name_ch,
                                    name_ht:event.name_ht===null?'':event.name_ht,
                                    name_at:event.name_at===null?'':' - '+event.name_at,
                                    name_sp:sport.name_sp,
                                    is_in_line:event.is_in_line,
                                    show_video:event.show_video===undefined?0:1
                                });
                            });
                        });
                    });
                    livesoon = _.values(livesoon);
                    livesoon = $filter('orderBy')(livesoon, ['date_sort','name_sp','time','order_ev']);
                    livesoon =
                        angular.forEach(livesoon, function (event, key_event) {
                        var date_d = '';
                        var name_sp_d='';
                        if(livesoon[key_event-1] !== undefined) {
                            if (livesoon[key_event].name_sp !== livesoon[key_event-1].name_sp) {
                                name_sp_d = livesoon[key_event].name_sp;
                            }
                            if (livesoon[key_event].date !== livesoon[key_event-1].date) {
                                date_d  = livesoon[key_event].date;
                                name_sp_d = livesoon[key_event].name_sp;
                            }
                        }
                        else {
                            name_sp_d = livesoon[key_event].name_sp;
                            date_d  = livesoon[key_event].date;
                        }
                        if(event.show_video === 1) {
                            video_status_calendar = event.show_video;
                        }
                        $scope.calendar.push({
                            date:date_d,
                            time:$scope.prepareDateSoon(event.date_ev, 'HH:mm'),
                            id_ev:event.id_ev,
                            id_ch:event.id_ch,
                            date_ev:event.date_ev,
                            name_ch:event.name_ch,
                            name_ht:event.name_ht,
                            name_at:event.name_at,
                            name_sp: name_sp_d,
                            is_in_line:event.is_in_line,
                            show_video:event.show_video
                        });
                    });
                    $scope.calendarShow = $scope.calendar.slice(0 , $scope.countRow);
                    $scope.lastCalendar = $scope.countRow;
                    setTimeout(function(){
                        $scope.calendarShow = $scope.calendar.slice(0 , $scope.countRow);
                        $scope.$digest();
                        setTimeout(function(){ $scope.loadMore(); }, 100);
                    },0);
                    $scope.calendar.show_video = video_status_calendar;
                }
            }
            else {
                $scope.empty = true;
            }
        };

        //  Получения всех данных с api
        $scope.mainRequest = function (){
            var cache = localStorageService.get('main_page');
            if (cache !== null){
                cache = angular.fromJson(cache);
            }
            if(cache !== null && cache.md+0 >= (new Date()).getTime() /1000) {
                $scope.processData(cache.data);
            }
            else {
                bcApi.getApi(config.apiLocation +
                    '/v1/json/main'
                    + '?lng=' + config.lang)
                    .then(function(data){
                        $scope.processData(data);
                        localStorageService.set('main_page', angular.toJson({md: ((new Date()).getTime() /1000) , data: data}));
                    }).finally(function(){
                        $('.angular-error').hide();
                    });
            }
        };

        //  Обновление Live
        $scope.liveRequest = function (){
            if (liveExtra.connected && $scope.isWS){
                return false;
            }
                bcApi.getApi(config.apiLocation +
                    '/v1/live/line?rev=3&add=name_sp,name_ch,name_ht,name_at'
                    + '&lng=' + config.lang
                    + "&md="+$scope.md)
                    .then(function(data){
                        var events_array = [];
                        var delete_ev = false;
                        $scope.md = data.reply.ntime;
                        events_array = $scope.events;

                        //  Удаление события
                        if($scope.events !== undefined) {
                            angular.forEach($scope.events,function(ev, ev_id){
                                if(ev.id_ev !== undefined && ev.id_ev !== null) {
                                    if (!_.isEmpty(data.reply.del_ev) && _.indexOf(data.reply.del_ev,ev.id_ev) !== -1){
                                        delete events_array[ev_id];
                                        delete_ev = true;
                                    }
                                }
                            });
                        }

                        //  Добавление события
                        if(data.reply.sports !== undefined) {
                            angular.forEach(data.reply.sports,function(sport){
                                angular.forEach(sport.chmps,function(chmp){
                                    angular.forEach(chmp.evts,function(evt,key_evt){
                                        if(_.findWhere($scope.events,{id_ev:evt.id_ev}) === undefined) {
                                            events_array.push({
                                                order: chmp.order,
                                                order_ev: evt.order,
                                                id_ev:evt.id_ev,
                                                date_ev:evt.date_ev,
                                                name_ch:chmp.name_ch,
                                                name_ht: (!evt.name_ht) ? '' : evt.name_ht,
                                                name_at:(!evt.name_at) ?'' : ' - '+evt.name_at,
                                                name_sp:sport.name_sp,
                                                show_video:evt.show_video===undefined?0:1
                                            });
                                            delete_ev = true;
                                        }
                                    });
                                });
                            });
                        }

                        //  Удаление html
                        if(delete_ev) {
                            angular.forEach($scope.events,function(ev_del){
                                if(ev_del.id_ev !== undefined && ev_del.id_ev !== null) {
                                    angular.element("#events").empty();
                                }
                            });
                        }

                        $scope.events = [];
                        $scope.events = _.values(events_array);
                        $scope.events = $filter('orderBy')($scope.events,['name_sp','date_ev','order_ev']);
                    });
        };

        /**
         * подписываемся на изм. кф. через веб-сокет
         */
        $scope.counterPack = 0;
        ($scope.wsConnect = function(){
            liveExtra
                .setFlagAddKf(false)
                .setLang(config.lang)
                .connect(function(){
                    liveExtra.subscribe(function (message) {
                        $scope.isWS = true;
                        //если послед. сообщений не соблюдается, то идем по всеми данными
                        if (!_.isObject(message)){
                            message = angular.fromJson(message);
                        }

                        if (message.counter === undefined || ($scope.counterPack > 0 && $scope.counterPack > message.counter)){
                            //liveExtra.connected = false;
                            $scope.isWS = false;
                            $scope.counterPack = 0;
                            return;
                        }else{
                            $scope.counterPack = message.counter;
                        }
                        message = angular.fromJson(message);
                        if (message.reply === undefined){
                            return false;
                        }
                        if (message.md !== undefined){
                            $scope.lastMd = message.md;
                        }
                        message = message.reply;
                        if ($scope.disable){
                            $scope.buffer.push(message);
                        }
                        else{
                            var l = $scope.buffer.length;
                            if ( l > 0 ){
                                while ( l-- ){
                                    if ($scope.buffer[l] !== undefined){
                                        $scope.processItem($scope.buffer[l]);
                                    }
                                }
                                $scope.buffer = [];
                            }
                            $scope.processItem(message);
                        }
                    });

                });
        })();
        /**
         * накатываем изм. из ws
         * @param message
         */
        $scope.processItem = function(message){

            var events_array = [];
            var delete_ev = false;
            events_array = $scope.events;
            $scope.loadingWS = true;

            if(message.sports !== undefined) {
                angular.forEach(message.sports,function(sport){
                    angular.forEach(sport.chmps,function(chmp){
                        angular.forEach(chmp.evts,function(evt){
                            if (evt !== undefined){
                                //  Добавление события
                                if(_.findWhere($scope.events,{id_ev:evt.id_ev}) === undefined && evt.del===0 && evt.is_test===0) {
                                    //  Добавлеяем name_sp и name_ch если их нет
                                    if(sport.name_sp===undefined || chmp.name_ch===undefined) {
                                        angular.forEach($scope.events,function(name){
                                            if(chmp.name_ch===undefined&&name.id_ch === chmp.id_ch) {
                                                chmp.name_ch = name.name_ch;
                                            }
                                            if(sport.name_sp===undefined&&name.id_sp === sport.id_sp) {
                                                sport.name_sp = name.name_sp;
                                            }
                                        });
                                    }
                                    events_array.push({
                                        order_ev: evt.order,
                                        id_ev:evt.id_ev,
                                        id_sp:sport.id_sp,
                                        id_ch:chmp.id_ch,
                                        date_ev:evt.date_ev,
                                        name_ch:chmp.name_ch,
                                        name_sp:sport.name_sp,
                                        name_ht: (!evt.name_ht) ? '' : evt.name_ht,
                                        name_at:(!evt.name_at) ?'' : ' - '+evt.name_at,
                                        show_video:evt.video_status===undefined?0:1
                                    });
                                    delete_ev = true;
                                }
                                //  Удаление события и изменение видео статуса
                                if (evt.is_test===0){
                                    angular.forEach(events_array,function(ev,key_ev){
                                        if(evt.id_ev === ev.id_ev) {
                                            if(evt.video_status!==undefined && evt.video_status !== ev.show_video) {
                                                events_array[key_ev].show_video = evt.video_status;
                                            }
                                            if (evt.del !== 0) {
                                                delete events_array[key_ev];
                                                delete_ev = true;
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    });
                });
            }

            //  Удаление html
            $scope.events = [];
            if(delete_ev) {
                angular.element("#events").empty();
            }

            $scope.events = _.values(events_array);
            $scope.events = $filter('orderBy')($scope.events,['name_sp','date_ev','order_ev']);
            $scope.loadingWS = false;
            $scope.$digest();
        };
        /**
         * для проверки вебсокета, если не получилось подключиться
         */
        $scope.loadSnapshotWSCheck = function () {
            if (!liveExtra.connected || !$scope.isWS) {
                $scope.wsConnect();
            }
        };

        $scope.mainRequest();
        //$scope.liveRequestInterval = setInterval($scope.liveRequest, 15000);
        $scope.checkIntervalWS = setInterval($scope.loadSnapshotWSCheck, 30000);

        /**/
        $scope.$on('$destroy', function () {
            clearInterval($scope.checkIntervalWS);
            delete liveFilter;
            if (liveExtra.connected){
                liveExtra.disconnect();
            }
        });
    });
});
