/*global $ */
/*global jQuery */
/*global ML: true */
/*jslint browser:true */
/*jslint todo: true */
/*jslint devel: true, indent: 2, sloppy: true, sub: true, plusplus: true */

/*
 Copyright 2002-2012 MarkLogic Corporation.  All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */


/* Author: Amey Dhavle
 Description: Config driven advancedsearch widget.
 Usage:
 1) Define fields that you wish to have in the advanced search widget
 e.g.
  var advancedSearch =
    {"fields": {
      "field": [
        {
          "label": "Social Issue",
          "id": "socialIssue",
          "placeholder": "Social Issues",
          "name": "socialIssue",
          "suggest": true
        },...
 2) Include advancedsearch.js in HTML
  <script src="/application/custom/js/marklogic/advancedsearch.js" type="text/javascript" xml:space="preserve"><!-- --></script>
 3) Define placeholder/container in the HTML
 e.g.
  <div id="advancedSearchForm" class="widget" class="box"><!-- --></div>
 4) Tip: Ideally the advanced search widget should be bind to a onClick event to toggle display
 e.g.
  $(document).ready(function () {
    $("#advancedSearchForm").hide();
    $("#advancedSearch").click(function () {
      if ($("#advancedSearchForm").is(":hidden")) {
        $("#advancedSearchForm").slideDown("slow");
      } else {
        $("#advancedSearchForm").slideUp("slow");
      }
    });
  });

  Dependencies:
  - jQuery
  - MarkLogic Visualization Widget's widget.js, controller.js

 */
var ML = ML || {};
ML.createAdvancedSearch = function (containerID, config) {
  config = config || {
  };
  var container, containerSel, widget, fields;
  fields = config.fields.field;
  containerSel = '#' + containerID;
  container = $(containerSel);

  (function () {
    var param, paramStrArray, i, length, q = '';
    paramStrArray = window.location.search.substr(1).split('&');
    length = paramStrArray.length;
    for (i = 0; i < length; i = i + 1) {
      param = paramStrArray[i].split('=');
      if (param[0] === 'q') {
        q = decodeURIComponent(param[1].replace(/\+/g, '%20'));
        break;
      }
    }
    // DMC: this function isn't returning to anything, so it seems like it has no effect
    return q;
  }());

  // Helper Functions
  function parseXml(xml) {
    var items = [];
    $(xml).find("distinct-value").each(function () {
      items.push($(this).text());
    });
    return items;
  }

  function buildAutoSuggest(fieldID, fieldName) {
    var items = [];
    $.ajax({
      type: "GET",
      url: "/v1/values/" + fieldID + "?options=autosuggest&format=xml",
      dataType: "xml",
      success: function (xml) {
        items = parseXml(xml);
        $("#" + fieldName).autocomplete({
          source: items,
          minLength: 1
        });
      }
    });
  }

  function makeFocusHandler(id, name) {
    return function () {
      if (document.getElementById(id).getAttribute("suggest") === 'true') {
        buildAutoSuggest(id, name);
      }
    };
  }

  function buildRow(formFields) {
    var m, row, arithmeticOperators, inputFieldSize;
    row = [];
    for (m in formFields) {
      if (formFields.hasOwnProperty(m)) {
        arithmeticOperators = formFields[m].operators || 'none';
        inputFieldSize = 60;
        if (formFields[m].size > 0) {
          inputFieldSize = formFields[m].size;
        }
        row.push($("<tr/>")
          .append($("<td/>>")
            .append($("<label/>")
              .attr("for", "normal-field")
              .append($("<strong/>").text(formFields[m].label))))
          .append($("<td/>>"))
          .append($("<td/>")
            .append($("<div/>")
              .attr("id", formFields[m].id)
              .attr("style", "display:" + arithmeticOperators))
            .append($("<input/>")
              .attr("type", "text")
              .attr("size", inputFieldSize)
              .attr("name", formFields[m].name)
              .attr("suggest", formFields[m].suggest)
              .attr("placeholder", formFields[m].placeholder)
              .attr("id", formFields[m].id)
              .focus(makeFocusHandler(formFields[m].id, formFields[m].name))))
          );
      }
    }
    return row;
  }

  function triggerSearch(e) {
    e.preventDefault();
    var qry = $(containerSel + " .advSrch")
      .serialize()
      .replace(/[^&]+=\.?(?:&|$)/g, '') // remove constraint names
      .replace(/\=/g, ':') // replace = with :
      .replace(/&$/, '') // remove queries ending in &
      .replace(/\&/g, ' AND ') // change "&" to "AND"
      .replace(':+GT+', ' GT ')
      .replace(':+LT+', ' LT ');
    $(containerSel + " .queryStr").text(qry);
    $("#advancedSearchForm").hide();
    widget.updateQuery({
      text: $(containerSel + " .queryStr").text()
    });
    return false;
  }

  // Initialization
  //TODO: get rid of second param for the auto suggest, keep naming in sync with autosuggest.xml
  container.append($("<div/>")
    .addClass("box-content")
    .append($("<form/>")
      .addClass("advSrch")
      .append(buildRow(fields))
      .append($("<tr/>")
        .append($("<td/>")
          .attr("colspan", "3")
          .append("<tt/>")
          .addClass("queryStr")))
      .append($("<tr/>")
        .append($("<td/>")
          .attr("colspan", "3")
          .append($("<center/>")
            .append($("<input/>")
              .attr("type", "button")
              .attr("value", "Search")
              .click(triggerSearch)))))));

  widget = ML.createWidget(container, function () {});

  return {
    clearQuery: function () {
      $(containerSel + " .queryStr").val("");
      widget.updateQuery({
        text: ""
      });
    }
  };
}

jQuery.fn.extend({
  when: function (condition) {
    var ret = this.pushStack("", "when", "");
    ret.otherwiseObject = this.pushStack("", "otherwise", "");
    jQuery.merge(condition ? ret : ret.otherwiseObject, this);
    return ret;
  },
  otherwise: function () {
    return this.otherwiseObject || jQuery();
  }
});