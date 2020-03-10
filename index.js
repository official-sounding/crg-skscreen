(function () {
    'use strict';

    $(initialize)

    function initialize() {
        var teamId = _windowFunctions.getParam("team");

        WS.Connect();
        WS.AutoRegister();

        var root = $('#skScore');
        var controls = $('#TeamTime');
        var sk1 = $('<div>').addClass('SKSheet').appendTo(root);

        $('<div>').attr('id', 'TripEditor').appendTo(root);
        $('<div>').attr('id', 'skaterSelector').appendTo(root);
        
        prepareSkSheetTable(sk1, teamId, 'operator');

        prepareScorePanel(teamId).addClass('TabTable').appendTo(controls);
        prepareTripEditor();

        prepareOptionsDialog(teamId);

        if (!teamId) { openOptionsDialog(); }
    }

    function prepareScorePanel(team) {
        var table = $("<table>").addClass("Team");
        var row = $("<tr></tr>");
        var nameRow = row.clone().addClass("Name").appendTo(table);
        var scoreRow = row.clone().addClass("Score").appendTo(table);
        var speedScoreRow = row.clone().addClass("SpeedScore").appendTo(table);
        var timeoutRow = row.clone().addClass("Timeout").appendTo(table);
        var flagsRow = row.clone().appendTo(table);
        var jammerRow = row.clone().addClass("Jammer").appendTo(table);
        var pivotRow = row.clone().addClass("Pivot").appendTo(table);

        var prefix = "ScoreBoard.Team(" + team + ")";
        var first = true;

        var nameTr = _crgUtils.createRowTable(2).appendTo($("<td>").appendTo(nameRow)).find("tr");
        var scoreTr = _crgUtils.createRowTable(3).appendTo($("<td>").appendTo(scoreRow)).find("tr");
        var speedScoreTr = _crgUtils.createRowTable(4).appendTo($("<td>").appendTo(speedScoreRow)).find("tr");
        var timeoutTr = _crgUtils.createRowTable(6).appendTo($("<td>").appendTo(timeoutRow)).find("tr");
        var flagsTr = _crgUtils.createRowTable(2).appendTo($("<td>").appendTo(flagsRow)).find("tr");
        var jammerTr = _crgUtils.createRowTable(1).appendTo($("<td>").appendTo(jammerRow)).find("tr");
        var pivotTr = _crgUtils.createRowTable(1).appendTo($("<td>").appendTo(pivotRow)).find("tr");

        var nameTd = nameTr.children("td:eq(" + (first ? 1 : 0) + ")").addClass("Name");
        var nameDisplayDiv = $("<div>").appendTo(nameTd);
        var nameA = $("<a>").appendTo(nameDisplayDiv);
        var altNameA = $("<a>").appendTo(nameDisplayDiv);

        var nameEditTable = $("<table><tr><td>Team Name</td><td>Alternate Name</td></tr>" +
            "<tr><td><input class='Name' type='text' size='15' /></td>" +
            "<td><input class='AlternateName' type='text' size='15' /></td></tr></table>").appendTo(nameTd);
        var nameInput = $(nameEditTable).find(".Name");
        var altNameInput = $(nameEditTable).find(".AlternateName");

        nameEditTable.hide();
        WS.Register(prefix + ".Name", function (k, v) { nameA.text(v); });
        WSControl(prefix + ".Name", nameInput);
        var nameInputFocus = function () {
            if (nameDisplayDiv.css("display") != "none") {
                nameDisplayDiv.hide();
                nameEditTable.show();
                nameInput.addClass("Editing").trigger("editstart");;
                altNameInput.addClass("Editing").trigger("editstart");;
            }
        };
        var nameInputBlur = function (event) {
            if (event.relatedTarget != nameInput[0] && event.relatedTarget != altNameInput[0]) {
                nameEditTable.hide();
                nameDisplayDiv.show();
                nameInput.removeClass("Editing").trigger("editstop");;
                altNameInput.removeClass("Editing").trigger("editstop");;
            }
        };
        var nameInputKeyup = function (event) {
            var c = $(event.target);
            switch (event.which) {
                case 13: /* RET */ if (c.is("textarea") && !event.ctrlKey) break; c.blur(); break;
                case 27: /* ESC */ c.blur(); break;
            }
        };

        nameDisplayDiv.bind("click", function () { nameInput.focus(); });
        nameInput.bind("focus", nameInputFocus);
        altNameInput.bind("focus", nameInputFocus);
        nameInput.bind("blur", nameInputBlur);
        altNameInput.bind("blur", nameInputBlur);
        nameInput.bind("keyup", nameInputKeyup);
        altNameInput.bind("keyup", nameInputKeyup);

        altNameInput.bind("change", function () {
            var val = $.trim(altNameInput.val());
            if (val == "") {
                WS.Set(prefix + ".AlternateName(operator)", null);
            } else {
                WS.Set(prefix + ".AlternateName(operator)", val);
            }
        });

        WS.Register(prefix + ".AlternateName(operator)", function (k, v) {
            altNameA.text(v || "");
            altNameInput.val(v || "");
            nameA.toggleClass("AlternateName", v != null);
        });

        var names = nameA.add(altNameA);
        WS.Register(prefix + ".Color(*)", function (k, v) {
            v = v || "";
            switch (k.Color) {
                case "operator_fg":
                    names.css("color", v);
                    break;
                case "operator_bg":
                    names.css("background-color", v);
                    break;
                case "operator_glow":
                    var shadow = "";
                    if (v) {
                        shadow = '0 0 0.2em ' + v;
                        shadow = shadow + ', ' + shadow + ', ' + shadow;
                    }
                    names.css("text-shadow", shadow);
                    break;
            }
        });

        var logoTd = nameTr.children("td:eq(" + (first ? 0 : 1) + ")").addClass("Logo");
        var logoNone = $("<a>").html("No Logo").addClass("NoLogo").appendTo(logoTd);
        var logoSelect = mediaSelect(prefix + ".Logo", "images", "teamlogo", "Logo")
            .appendTo(logoTd);
        var logoImg = $("<img>").appendTo(logoTd);

        var logoShowSelect = function (show) {
            var showImg = !!(WS.state[prefix + ".Logo"]);
            logoImg.toggle(!show && showImg);
            logoNone.toggle(!show && !showImg);
            logoSelect.toggle(show);
            if (show) {
                logoSelect.focus();
            }
        };
        WS.Register(prefix + ".Logo", function (k, v) {
            logoShowSelect(false);
            logoImg.attr("src", v);
        });
        logoSelect
            .blur(function () { logoShowSelect(false); })
            .keyup(function (event) { if (event.which == 27 /* ESC */) $(this).blur(); });

        logoTd.click(function () { if (!logoSelect.is(":visible")) logoShowSelect(true); });

        var scoreTd = scoreTr.children("td:eq(" + (first ? "0" : "2") + ")").addClass("Down");
        $("<button>").text("Score -1")
            .attr("id", "Team" + team + "ScoreDown").addClass("KeyControl BigButton").button()
            .click(function () { WS.Set(prefix + ".TripScore", -1, "change"); })
            .appendTo(scoreTd);
        $("<br />").appendTo(scoreTd);
        $("<button>").text("Trip -1").val("true")
            .attr("id", "Team" + team + "RemoveTrip").addClass("KeyControl TripButton").button()
            .click(function () { WS.Set(prefix + ".RemoveTrip", true); })
            .appendTo(scoreTd);

        var scoreSubTr = _crgUtils.createRowTable(3).appendTo(scoreTr.children("td:eq(1)")).find("tr");
        var score = $("<a/>").appendTo(scoreSubTr.children("td:eq(1)").addClass("Score"));
        WS.Register(prefix + ".Score", function (k, v) { score.text(v); });

        var scoreTd = scoreTr.children("td:eq(" + (first ? "2" : "0") + ")").addClass("Up");

        $("<button>").text("Score +1")
            .attr("id", "Team" + team + "ScoreUp").addClass("KeyControl BigButton").button()
            .click(function () { WS.Set(prefix + ".TripScore", +1, "change"); })
            .appendTo(scoreTd);
        $("<br />").appendTo(scoreTd);
        $("<button>").text("Trip +1")
            .attr("id", "Team" + team + "AddTrip").addClass("KeyControl TripButton").button()
            .click(function () { WS.Set(prefix + ".AddTrip", true); })
            .appendTo(scoreTd);

        for (var i = 1; i <= 4; i++) {
            var pos = (i - 1);
            if (!first) {
                pos = 3 - pos;
            }
            (function (i) {
                $("<button>").text(i)
                    .attr("id", "Team" + team + "TripScore" + i).addClass("KeyControl").button()
                    .click(function () { WS.Set(prefix + ".TripScore", i); })
                    .appendTo(speedScoreTr.find("td:eq(" + pos + ")"));
            }(i));
        }


        // Note instantaneous score change is always towards the center.	Jam score total is on the outside.
        var scoreChange = $("<a>").css({ opacity: "0" }).appendTo(scoreSubTr.children("td:eq(" + (first ? "2" : "0") + ")")).addClass("TripScore");
        var jamScore = $("<a>").appendTo(scoreSubTr.children("td:eq(" + (first ? "0" : "2") + ")")).addClass("JamScore");

        var scoreChangeTimeout;
        WS.Register(prefix + ".TripScore", function (k, v) {
            var c = (v > 0 ? "#080" : "#008");
            scoreChange.stop(true).text(v).last().css({ opacity: "1", color: c });
            if (scoreChangeTimeout)
                clearTimeout(scoreChangeTimeout);
            scoreChangeTimeout = setTimeout(function () {
                scoreChange.last()
                    .animate({ color: "#000" }, 1000)
                    .animate({ opacity: "0" }, 1000, "easeInExpo");
                scoreChangeTimeout = null;
            }, 2000);
        });

        jamScore.stop(true).text("0").last().css({ opacity: "1", color: "#008" });
        var jamScoreTimeout;
        WS.Register(prefix + ".JamScore", function (k, v) {
            var c = (v > 0 ? "#080" : "#008");
            jamScore.stop(true).text(v).last().css({ opacity: "1", color: c });
            if (jamScoreTimeout)
                clearTimeout(jamScoreTimeout);
            jamScoreTimeout = setTimeout(function () {
                jamScore.last()
                    .animate({ color: "#008" }, 2000)
            }, 2000);
        });

        var timeoutButton = $("<button>").text("Team TO")
            .attr("id", "Team" + team + "Timeout").addClass("KeyControl").button()
            .click(function () { WS.Set(prefix + ".Timeout", true); });
        timeoutButton.appendTo(timeoutTr.children("td:eq(" + (first ? "0" : "5") + ")").addClass("Timeout"));
        var timeoutCount = $("<a/>").click(function () { timeoutDialog.dialog("open"); })
            .appendTo(timeoutTr.children("td:eq(" + (first ? "1" : "4") + ")").addClass("Timeouts"));
        WS.Register(prefix + ".Timeouts", function (k, v) { timeoutCount.text(v); });

        var reviewButton = $("<button>").text("Off Review")
            .attr("id", "Team" + team + "OfficialReview").addClass("KeyControl").button()
            .click(function () { WS.Set(prefix + ".OfficialReview", true); });
        reviewButton.appendTo(timeoutTr.children("td:eq(" + (first ? "2" : "3") + ")").addClass("OfficialReview"));
        var officialReviews = $("<a/>").click(function () { timeoutDialog.dialog("open"); })
            .appendTo(timeoutTr.children("td:eq(" + (first ? "3" : "2") + ")").addClass("OfficialReviews"));
        WS.Register(prefix + ".OfficialReviews", function (k, v) { officialReviews.text(v); });

        WS.Register(["ScoreBoard.TimeoutOwner", "ScoreBoard.OfficialReview"], function (k, v) {
            var to = WS.state["ScoreBoard.TimeoutOwner"] == team;
            var or = isTrue(WS.state["ScoreBoard.OfficialReview"]);
            timeoutButton.toggleClass("Active", to && !or);
            reviewButton.toggleClass("Active", to && or);
        });

        var retainedORButton = WSActiveButton(prefix + ".RetainedOfficialReview", $("<button>")).text("Retained")
            .attr("id", "Team" + team + "RetainedOfficialReview").addClass("KeyControl").button();
        retainedORButton.appendTo(timeoutTr.children("td:eq(" + (first ? "4" : "1") + ")").addClass("RetainedOfficialReview"));

        if (first) {
            var otoButton = $("<button>").text("Official TO")
                .attr("id", "OfficialTimeout").addClass("KeyControl").button()
                .click(function () { WS.Set("ScoreBoard.OfficialTimeout", true); });
            WS.Register("ScoreBoard.TimeoutOwner", function (k, v) {
                otoButton.toggleClass("Active", v == "O");
            });
            otoButton.appendTo(timeoutTr.children("td:eq(5)").addClass("OfficialTimeout"));
            otoButton.wrap("<div></div>");
        }

        var leadJammerTd = flagsTr.children("td:eq(" + (first ? "1" : "0") + ")").css("direction", "ltr");
        WSActiveButton(prefix + ".Lost", $("<button>")).text("Lost")
            .attr("id", "Team" + team + "Lost").addClass("KeyControl").button().appendTo(leadJammerTd);
        WSActiveButton(prefix + ".Lead", $("<button>")).text("Lead")
            .attr("id", "Team" + team + "Lead").addClass("KeyControl").button().appendTo(leadJammerTd);
        WSActiveButton(prefix + ".Calloff", $("<button>")).text("Call")
            .attr("id", "Team" + team + "Call").addClass("KeyControl").button().appendTo(leadJammerTd);
        WSActiveButton(prefix + ".Injury", $("<button>")).text("Inj")
            .attr("id", "Team" + team + "Inj").addClass("KeyControl").button().appendTo(leadJammerTd);
        WSActiveButton(prefix + ".NoInitial", $("<button>")).text("NI")
            .attr("id", "Team" + team + "NI").addClass("KeyControl").button().appendTo(leadJammerTd);

        leadJammerTd.buttonset();

        var starPassTd = flagsTr.children("td:eq(" + (first ? "0" : "1") + ")").css("direction", "ltr");
        var starPassButton = WSActiveButton(prefix + ".StarPass", $("<button>")).text("Star Pass")
            .attr("id", "Team" + team + "StarPass").addClass("KeyControl").button().appendTo(starPassTd);
        var noPivotButton = WSActiveButton(prefix + ".NoPivot", $("<button>")).text("No Pivot")
            .attr("id", "Team" + team + "NoPivot").addClass("KeyControl").button().appendTo(starPassTd);

        var makeSkaterSelector = function (pos) {
            var container = $('<span class="skaterSelector">')

            var none = $('<button>').text("?").attr("skater", "").attr('id', 'Team' + team + pos + 'None').addClass('KeyControl').button();
            container.append(none).buttonset();
            none.click(function () { WS.Set(prefix + '.Position(' + pos + ').Skater', "") });

            function setValue(v) {
                container.children().removeClass("Active");
                v = v || "";
                container.children('[skater="' + v + '"]').addClass("Active");
            }
            WS.Register([prefix + '.Skater(*).Number', prefix + '.Skater(*).Role'], function (k, v) {
                container.children('[skater="' + k.Skater + '"]').remove();
                if (v != null && WS.state[prefix + '.Skater(' + k.Skater + ').Role'] != 'NotInGame') {
                    var number = WS.state[prefix + '.Skater(' + k.Skater + ').Number'];
                    var button = $('<button>').attr('number', number).attr('skater', k.Skater)
                        .attr('id', 'Team' + team + pos + k.Skater).addClass('KeyControl').text(number)
                        .click(function () {
                            WS.Set(prefix + '.Position(' + pos + ').Skater', k.Skater);
                        }).button();
                    _crgKeyControls.setupKeyControl(button, _crgKeyControls.operator);
                    _windowFunctions.appendAlphaSortedByAttr(container, button, 'number', 1);
                }
                setValue(WS.state[prefix + '.Position(' + pos + ').Skater']);
            });
            WS.Register(prefix + '.Position(' + pos + ').Skater', function (k, v) {
                setValue(v);
            });
            return container;
        };

        var jammerSelectTd = jammerTr.children("td");
        $('<span>').text('Jammer:').appendTo(jammerSelectTd);
        makeSkaterSelector("Jammer").appendTo(jammerSelectTd);

        WSActiveButton(prefix + ".Position(Jammer).PenaltyBox", $("<button>")).text("Box")
            .attr("id", "Team" + team + "JammerBox").addClass("KeyControl Box").button().appendTo(jammerSelectTd);

        var pivotSelectTd = pivotTr.children("td");
        $('<span>').text('Piv/4th Bl:').appendTo(pivotSelectTd);
        makeSkaterSelector("Pivot").appendTo(pivotSelectTd);

        WSActiveButton(prefix + ".Position(Pivot).PenaltyBox", $("<button>")).text("Box")
            .attr("id", "Team" + team + "PivotBox").addClass("KeyControl Box").button().appendTo(pivotSelectTd);

        return table;
    }

    var optionsDialog;

function openOptionsDialog() {
	optionsDialog.dialog('open');
}

function prepareOptionsDialog(teamId, onlySettings) {
	var table = $('<table>').appendTo($('#OptionsDialog'));

	var zoomable = $("<label/><input type='checkbox'/>").addClass("ui-button-small");
	var id = newUUID();
	zoomable.first().attr("for", id);
	var zoomInput = zoomable.last().attr("id", id).button();
	zoomInput.prop("checked", _windowFunctions.checkParam("zoomable", 1));
	zoomable.button("option", "label", "Pinch Zoom " + (zoomInput.prop("checked")?"Enabled":"Disabled"));
	zoomInput.change(function(e) {
		zoomable.button("option", "label", "Pinch Zoom " + (zoomInput.prop("checked")?"Enabled":"Disabled"));
	});
	zoomInput.change();

	if (!onlySettings) {
		teamId = (teamId == "2" ? "2" : "1");	 // Ensure we start with a sane value.
		$('<tr>').append($('<th>').text('Select Team')).appendTo(table);
		$.each( [ '1', '2' ], function() {
			var tId = String(this);
			var row = $('<tr>').addClass('selectTeam'+tId).appendTo(table);
			$('<td>').append($('<button>').attr('team', tId).addClass('name').toggleClass('selected', tId === teamId).button().click(function() {
				teamId = tId;
				table.find('[team]').removeClass("selected");
				table.find('[team="'+tId+'"]').addClass("selected");
			})).appendTo(row);
		});
		$('<tr>').append($('<th>').text('Options')).appendTo(table);

		WS.Register(['ScoreBoard.Team(*).Name', 'ScoreBoard.Team(*).AlternateName(operator)'], function(k, v) {
			var displayName = 'Team ' + k.Team + ': ' + WS.state['ScoreBoard.Team('+k.Team+').Name'];
			var altName = WS.state['ScoreBoard.Team('+k.Team+').AlternateName(operator)'];
			if (altName != null) { displayName = displayName + ' / ' + altName; }
			$('.selectTeam'+k.Team+' .name span').text(displayName);
		});
	}
	$('<tr>').append($('<td>').append(zoomable)).appendTo(table);

	var setURL = function() {
		var updated = window.location.href.replace(/[\?#].*|$/, '?zoomable='+(zoomInput.prop("checked")?1:0));
		if (!onlySettings) {
			updated = updated + '&team='+teamId;
		}
		if (updated != window.location.href) {
			window.location.href = updated;
			optionsDialog.dialog('close');
		}
	};
	
	optionsDialog = $('#OptionsDialog').dialog({
		modal: true,
		closeOnEscape: true,
		title: 'Option Editor',
		buttons: [{ text: "Save", click: setURL }],
		width: '500px',
		autoOpen: false,
	});
}
})();
//# sourceURL=index.js