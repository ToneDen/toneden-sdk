define(['jquery', 'vendor/simple-slider', 'underscore', 'vendor/sc-player', 'vendor/handlebars', 'hbs!templates/player', 'hbs!templates/player-solo', 'templates/helpers/msToTimestamp', 'vendor/d3'], function($, SimpleSlider, _, scPlayer, Handlebars, template, template_solo, msToTimestamp, d3) {
    return {
        create: function(urls, dom, options) {
            ToneDen.players = ToneDen.players || [];

            var staticUrl = '//widget.dev/sdk/';
            var player;

            // Default parameters go here.
            var parameters = {
                debug: false,
                skin: 'light',
                tracksPerArtist: 5,
                eq: 'waves',
                visualizer: true,
                single: false,
            };

            // Setup the parameters object with the given arguments and
            // override the default parameters with the given options.
            if(arguments.length === 1 && typeof arguments[0] === 'object') {
                _.extend(parameters, arguments[0]);
            } else {
                parameters.urls = urls;
                parameters.dom = dom;
                parameters.skin = skin;
                parameters.eq = eq;
                parameters.visualizer = visualizer;
                parameters.single = single;

                delete options.urls;
                delete options.dom;
                delete options.skin;
                delete options.eq;
                delete options.visualizer;
                delete options.single;

                _.extend(parameters, options);
            }

            // Parameters for the SoundCloud player.
            var playerParameters = {
                consumerKey: '6f85bdf51b0a19b7ab2df7b969233901',
                debug: parameters.debug,
                preload: true,
                togglePause: true,
                tracksPerArtist: parameters.tracksPerArtist
            }

            var dom = parameters.dom;
            var urls = parameters.urls;
            var container = $(dom);
            var currentRatio = null;
            var currentTimeIn = null;

            // Helper functions.
            function log(message, isError) {
                if(window.console) {
                    if(!isError && parameters.debug) {
                        console.log(message);
                    } else if(level === 'error') {
                        console.error(message);
                    }
                }
            }

            function rerender(parameters) {
                parameters = JSON.parse(JSON.stringify(parameters));
                parameters.staticUrl = staticUrl;

                if(parameters.nowPlaying) {
                    for(var i = 0; i < parameters.tracks.length; i++) {
                        if(parameters.tracks[i].title === parameters.nowPlaying.title) {
                            parameters.tracks[i].playing = true;
                        }
                    }
                }
                if(parameters.single==true) {
                    container.html(template_solo(parameters));
                } else {
                    container.html(template(parameters));
                }

                //container responsiveness
                if(container.width()<600) {
                    container.find(".follow").addClass("follow-small").css("width", "100%");
                    container.find(".current-song-info").css("width", "100%").prependTo(container.find(".social"));
                    container.find(".buy").addClass("buy-small").css("width", "100%");
                    container.find(".track-info-stats").hide();
                }

                // if(container.height()<600) {
                //     container.find(".follow").addClass("follow-small").css("width", "100%");
                //     container.find(".current-song-info").css("width", "100%").prependTo(container.find(".social"));
                //     container.find(".buy").addClass("buy-small").css("width", "100%");
                //     container.find(".track-info-stats").hide();
                // }

                container.find('.scrubber-slider').simpleSlider({
                    highlight: true
                });
            }

            function drawEQ(data) {
                if(!data) {
                    var data = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
                }

                var d3Container = d3.select(container[0]);
                var chart = d3Container.select('.waveform svg');

                var n = 128;
                 
                var margin = {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0
                };

                var width = container.find('.cover').width();
                var height = container.find('.cover').height();
                var barWidth = (width - n) / n;
                 
                var x = d3.scale.linear()
                    .domain([0, n - 1])
                    .range([0, width]);
                 
                var y = d3.scale.linear()
                    .domain([0, 1.5])
                    .range([0, height]);

                var line = d3.svg.line()
                    .x(function(d, i) {
                        return x(i);
                    })
                    .y(function(d, i) {
                        return height - y(d);
                    })
                    .interpolate('basis');

                if(!chart.node()) {
                    chart = d3Container.select('.waveform').append('svg:svg')
                        .attr('width', width + margin.left + margin.right)
                        .attr('height', height + margin.top + margin.bottom)
                        .append('g');

                    if(parameters.eq == "waves"){
                        chart.selectAll('path')
                            .data([data])
                            .enter()
                            .append('svg:path')
                            .attr('d', line)
                            .attr('stroke-width', 3);
                    } else if(parameters.eq == "bars") {
                        chart.selectAll('rect')
                            .data(data)
                            .enter().append('rect')
                            .attr('x', function(d, i) {
                                return x(i);
                            })
                            .attr('y', function(d) {
                                return height - y(d);
                            })
                            .attr('width', barWidth)
                            .attr('height', function(d) {
                                return y(d);
                            });
                    }                
                }

                function redrawEQ(svg, data) {
                    if(parameters.eq === "waves") {
                        svg.selectAll('path')
                            .data([data])
                            .attr('d', line)
                            .transition()
                                .ease('linear')
                                .duration(100);
                    } else if(parameters.eq == "bars") {
                        chart.selectAll('rect')
                            .data(data)
                            .transition()
                            .duration(100)
                            .attr('y', function(d) {
                                return height - y(d);
                            })
                            .attr('height', function(d) {
                                return y(d);
                            });
                    }
                }

                redrawEQ(chart, data);
            }

            function changePlayButton(paused) {
                var playClass = 'fa-play-circle-o';
                var pauseClass = 'fa-pause';
                var playButton = container.find('.play');

                if(paused) {
                    playButton.removeClass(pauseClass);
                    playButton.addClass(playClass);
                } else {
                    playButton.removeClass(playClass);
                    playButton.addClass(pauseClass);
                }
            }

            // Perform the initial rendering.
            if(container) {
                rerender({
                    tracks: [],
                    skin: parameters.skin,
                    eq: parameters.eq,
                    tracksPerArtist: parameters.tracksPerArtist,
                    visualizer: parameters.visualizer,
                    single: parameters.single
                });
            } else {
                log('ToneDen Player: the container specified does not exist.', 'error');
                return;
            }

            var playerInstance = new scPlayer(urls, playerParameters);
            var titleArea = container.find('.title');

            // Set up listeners for dom elements.
            container.on('click', '.controls', function(e) {
                e.preventDefault();
                var target = $(e.target);

                console.log(container[0]);

                if(target.hasClass('play')) {
                    playerInstance.pause();
                } else if(target.hasClass('next')) {
                    playerInstance.next();
                } else if(target.hasClass('prev')) {
                    playerInstance.prev();
                }
            });

            container.on('click', '.track-info', function(e) {
                var row = $(this);
                var cls = row.attr('class');
                var index = Number(row.attr('data-index'));

                if(cls.indexOf('playing') === -1) {
                    playerInstance.goto(index);
                }
            });

            container.on('slider:changed', '.scrubber-slider', function(e, slider) {
                playerInstance.play();
                log('Slider Ratio: ' + slider.ratio);

                playerInstance.seek(slider.ratio);
            });

            // Document-wide listeners.
            function spacebarStop(e) {
                if (e.keyCode == 32) {
                    if(playerInstance) {
                        playerInstance.pause();
                    }
                    e.preventDefault();
                }
            }
            document.addEventListener('keydown', spacebarStop, false);

            function keyTrackNext(e) {
                if (e.keyCode == 39) {
                    if(playerInstance) {
                        playerInstance.next();
                    }
                    e.preventDefault();
                }
            }
            document.addEventListener('keydown', keyTrackNext, false);

            function keyTrackPrev(e) {
                if (e.keyCode == 37) {
                    if(playerInstance) {
                        playerInstance.prev();
                    }
                    e.preventDefault();
                }
            }
            document.addEventListener('keydown', keyTrackPrev, false);

            // Hook into SC player events.
            playerInstance.on('scplayer.play', function(e) {
                log('Playing.');

                changePlayButton(false);
            });

            playerInstance.on('scplayer.pause', function(e) {
                var paused = playerInstance.sound().paused;

                log('Pause state changed: ' + paused);

                changePlayButton(paused);
            });

            playerInstance.on('scplayer.stop', function(e) {
                log('Stopped.');
                container.find('.play').attr('src', staticUrl + 'img/play.png');
            });

            playerInstance.on('scplayer.track.whileloading', function(e, percent) {
                // log('Loaded: ' + percent + '%');
                container.find('.buffer').css('width', percent + '%');
            });

            playerInstance.on('scplayer.track.whileplaying', function(e, percent, eqData) {
                if(parameters.visualizer == true) {
                    drawEQ(eqData);
                }

                var ratio = percent / 100;
                var timeIn = msToTimestamp(playerInstance.position());
                var timeLeft = msToTimestamp(playerInstance.track().duration - playerInstance.position());

                // Round ratio to the nearest 3 decimal points.
                ratio = ratio.toFixed(3);

                // Only update the slider if the ratio has changed.
                if(ratio !== currentRatio) {
                    container.find('.scrubber-slider').simpleSlider('setRatio', ratio, true);
                }

                // Only update the play times if they have changed.
                if(timeIn !== currentTimeIn) {
                    container.find('.start-time').html(timeIn);
                    container.find('.stop-time').html(timeLeft);
                }

                currentRatio = ratio;
                currentTimeIn = timeIn;
            });

            playerInstance.on('scplayer.playlist.preloaded', function(e) {
                log('All tracks loaded.');

                playerInstance.tracks(function(tracks) {
                    log(tracks);
                    rerender({
                        nowPlaying: playerInstance.track(),
                        tracks: tracks,
                        skin: parameters.skin,
                        eq: parameters.eq,
                        tracksPerArtist: parameters.tracksPerArtist,
                        eq: parameters.eq,
                        visualizer: parameters.visualizer,
                        single: parameters.single
                    });
                });
            });

            playerInstance.on('scplayer.changing_track', function(e, trackIndex) {
                log('New track index: ' + trackIndex);

                container.find('.played').css('width', '0%');
                container.find('.buffer').css('width', '0%');

                playerInstance.tracks(function(tracks) {
                    rerender({
                        nowPlaying: playerInstance.track(),
                        tracks: tracks,
                        skin: parameters.skin,
                        eq: parameters.eq,
                        tracksPerArtist: parameters.tracksPerArtist,
                        eq: parameters.eq,
                        visualizer: parameters.visualizer,
                        single: parameters.single
                    });
                });
            });

            // Public methods that will be accessible on the player object.
            function destroy() {
                container.html('');
                playerInstance.destroy();

                ToneDen.players.splice(ToneDen.players.indexOf(player), 1);
                delete player;
            }

            function pause() {
                playerInstance.pause();
            }

            function play() {
                playerInstance.play();
            }

            function togglePause() {
                playerInstance.togglePause();
            }

            player = {
                destroy: destroy,
                pause: pause,
                parameters: parameters,
                play: play,
                togglePause: togglePause
            };

            ToneDen.players.push(player);

            return player;
        },
        /**
         * Returns the first player whose dom parameter matches the dom argument.
         */
        getInstanceByDom: function(dom) {
            if(!ToneDen.players) {
                return;
            }

            var testPlayer;

            for(var i = 0; i < ToneDen.players.length; i++) {
                testPlayer = ToneDen.players[i];

                if(typeof dom === 'string') {
                    if(testPlayer.parameters.dom === dom) {
                        return testPlayer;
                    }
                } else if(dom instanceof $) {
                    if($(testPlayer.parameters.dom).is(dom)) {
                        return testPlayer;
                    }
                }
            }
        }
    };
});
