/*global $ */
/*
Copyright 2002-2013 MarkLogic Corporation.  All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Feature documentation:

- Suggestions.
-- To use suggestions for a facet, include the "otherURL" property in the
-- facet's configuration. The URL must point to an endpoint that will return
-- a list of suggested values, based on three parameters:
--- rs:ns - the namespace of the target element
--- rs:element - the localname of the target element
--- rs:q - the value typed in so far
*/
var ML = ML || {};
ML.createSidebar = function (containerID, config) {
  config = config || {};

  // private properties
  var container,
    widget,
    htmlChiclets,
    htmlFacets,
    constraint,
    name,
    label,
    constraintType,
    chicletHTML,
    selected,
    hidden,
    exclude,
    facet,
    $otherSuggestions,

    // private methods
    displayChiclet,
    displayInSidebar,
    buildChiclet,
    buildFacet,
    addToSelected,
    removeFromSelected,
    trackHidden,
    renderCB,
    truncateStr,
    getBucketLabel;

  container = $('#' + containerID);
  selected = {};
  hidden = [];
  exclude = ['geospatial'];

  // Display facet in sidebar based on type and setting?
  displayInSidebar = function (facet) {
    return ($.inArray(facet.type, exclude) === -1) && (facet['side-bar'] === 'true');
  };

  // Track facets that have been selected (and have chiclets displayed)
  addToSelected = function (facet, label) {
    selected[facet] = label;
  };

  // Remove facet from selected list when chiclet is deleted
  removeFromSelected = function (facet) {
    delete selected[facet];
  };

  // Track facet lists that have been collapsed (list items not shown)
  trackHidden = function (facet) {
    var index = $.inArray(facet, hidden);
    if (index > -1) {
      hidden.splice(index, 1);
    } else {
      hidden.push(facet);
    }
  };

  // Truncate long strings based on a length limit
  truncateStr = function (str, length) {
    var returnStr;
    if (str.length > length) {
      returnStr = str.slice(0, length - 3) + "...";
    } else {
      returnStr = str;
    }
    return returnStr;
  };

  // Get bucket label based on bucket name from config bucket objects
  getBucketLabel = function (config, name) {
    var result = '', i;
    for (i in config.bucket) {
      if (config.bucket.hasOwnProperty(i)) {
        if (config.bucket[i].name === name) {
          result = config.bucket[i]['_value'];
          break;
        }
      }
    }
    return result;
  };

  renderCB = function (data) {
    var i, facet;
    if (!data.boundedbox) {

      facet = '';
      htmlChiclets = '';
      htmlFacets = [];
      // Build chiclets and facet lists
      for (facet in config.facets) {
        if (config.facets[facet] !== undefined) {
          // not in array of facet types to exclude and side-bar setting selected
          if (displayInSidebar(config.facets[facet])) {
            htmlChiclets += buildChiclet(facet);
            htmlFacets.push(buildFacet(facet, data));
          }
        }
      }
      container.html(htmlChiclets);
      for (i in htmlFacets) {
        if (htmlFacets.hasOwnProperty(i)) {
          container.append(htmlFacets[i]);
        }
      }
      $otherSuggestions = container.find(".suggestions");
    }
  };

  widget = ML.createWidget(container, renderCB);

  for (facet in config.facets) {
    if (config.facets[facet] !== undefined) {
      container.trigger('constraintType', {facet: facet, type: config.facets[facet].type});
    }
  }

  function selectValue(constraint, name, label, facetConfig) {
    displayChiclet(constraint, label, facetConfig);
    // Update UI
    widget.updateQuery({
      value: [name],
      facet: constraint,
      constraintType: facetConfig.type,
      noShadow: true
    });
  }

  // Handle facet item clicks
  container.on('click', '.facet-item a', function (e) {
    e.preventDefault();
    // What facet was clicked and what name?
    constraint = this.parentElement.parentElement.parentElement.id.substring(11); // ID text after "facet-list-"
    name = $(this).attr('rel');
    label = $(this).html();
    constraintType = config.facets[constraint].type;

    displayChiclet(constraint, label, config.facets[constraint]);
    // Update UI
    widget.updateQuery({
      value: [name],
      facet: constraint,
      constraintType: constraintType,
      noShadow: true
    });
  });

  container.on('keyup', '.other', function (e) {
    if (e.keyCode === "27") { // Escape key was pressed
      $otherSuggestions.removeClass("show");
    } else {
      var constraint = $(this).parents('.facet-list').attr("id").replace('facet-list-', '');
      $.ajax({
        type: 'GET',
        url: config.facets[constraint].otherURL,
        data: {
          'rs:q': $(this).val(),
          'rs:element': config.facets[constraint].qnames.elem,
          'rs:ns': config.facets[constraint].qnames['elem-ns']
        },
        dataType: 'json',
        success: function(data) {
          var i;
          $otherSuggestions.empty()
            .addClass("show");
          for (i in data) {
            if (data.hasOwnProperty(i)) {
              $otherSuggestions.append($("<li/>").text(data[i]));
            }
          }
        }
      });
    }
  });

  container.on('blur', '.other', function (e) {
    console.log(".other: blur");
    $otherSuggestions.removeClass("show");
    return true;
  });

  // Translate select event on a facet into a chiclet
  // Can occur when loading bookmark
  container.on('select', function (e, data) {
    if (config.facets[data.facet] !== undefined) {
      var absolute = config.facets[data.facet]['absolute-buckets'];
      if (absolute.use === 'true') {
        label = getBucketLabel(absolute, data.value[0]);
      } else {
        label = data.value[0];
      }
      displayChiclet(data.facet, label, config.facets[data.facet]);
    }
  });

  container.on('mousedown', '.suggestions li', function () {
    var value, constraint;
    value = $(this).text();
    constraint = $(this).parents('.facet-list').attr("id").replace('facet-list-', '');

    $otherSuggestions.parent().find(".other").val(value);
    $otherSuggestions.removeClass("show");
    selectValue(constraint, value, value, config.facets[constraint]);
  });

  displayChiclet = function (constraint, label, configFacets) {
    chicletHTML = '';
    // Replace chiclet HTML with new text
    if (configFacets.label['_value'] !== undefined) {
      chicletHTML = configFacets.label['_value'] + ': ' + label;
    } else {
      chicletHTML = configFacets.label + ': ' + label;
    }

    container.find('#chiclet-' + constraint + ' .content').html(truncateStr(chicletHTML, 32));
    // Hide list and show chiclet
    container.find("#facet-list-" + constraint).hide();
    container.find('#chiclet-' + constraint).show();
    addToSelected(constraint, label);
  };

  // Handle chiclet close clicks
  container.on('click', 'div.close-chiclet a', function (e) {
    e.preventDefault();
    // What facet was clicked?
    constraint = this.parentElement.parentElement.id.substring(8); // ID text after "chiclet-"
    constraintType = config.facets[constraint].type;

    // Hide chiclet and show list
    container.find("#facet-list-" + constraint).show();
    container.find('#chiclet-' + constraint).hide();
    // Update UI
    widget.updateQuery({
      facet: constraint // deselecting only needs a facet
    });
    removeFromSelected(constraint);
    return false;
  });

  // Handle title clicks
  container.on('click', 'div.facet-list a.tipdown', function () {
    // What facet was clicked?
    constraint = this.id.substring(12); // ID text after "facet-title-"
    // Toggle arrow
    container.find("a#facet-title-" + constraint).toggleClass('open');
    // Update UI
    container.find("#facet-list-" + constraint + ' ul').slideToggle(100);
    // Keep track of what's hidden
    trackHidden(constraint);
    return false;
  });

  buildChiclet = function (constraint) {
    var html = '',
      label,
      chicletDisplay,
      chicletContent;

    if (config.facets[constraint].label['_value'] !== undefined) {
      label = config.facets[constraint].label['_value'];
    } else {
      label = config.facets[constraint].label;
    }

    chicletDisplay = (selected[constraint] !== undefined) ? '' : ' hidden';
    html = '<div id="chiclet-' + constraint + '" class="chiclet' + chicletDisplay + '">';
    chicletContent = (selected[constraint] !== undefined) ? label + ': ' + selected[constraint] : '';
    html += '<div class="close-chiclet"><a href="#"></a></div><span class="content" title="' + chicletContent + '">' + truncateStr(chicletContent, 32) + '</span>';
    html += '</div><!-- end chiclet -->';
    return html;
  };

  function buildFacetItem(name, value, count) {
    var item = $('<li/>')
      .addClass('facet-item')
      .append($('<a/>')
        .attr('href', '#')
        .attr('rel', name)
        .attr('title', name)
        .html(truncateStr(value, 32)))
      .append($('<span/>')
        .addClass('count')
        .text('(' + count + ')'));

    return item;
  }

  buildFacet = function (constraint, data) {
    var html = '',
      label,
      facetData,
      listDisplay,
      listHidden,
      listTipdown,
      i,
      len,
      arr,
      values,
      key;
    if (data.facets[constraint] !== undefined) {
      facetData = data.facets[constraint].facetValues;

      if (config.facets[constraint].label['_value'] !== undefined) {
        label = config.facets[constraint].label['_value'];
      } else {
        label = config.facets[constraint].label;
      }

      listDisplay = (selected[constraint] !== undefined) ? ' hidden' : '';
      if ($.inArray(constraint, hidden) > -1) {
        listHidden = ' hidden';
        listTipdown = '';
      } else {
        listHidden = '';
        listTipdown = ' open';
      }

      arr = config.alias;
      if (facetData !== undefined) {
        values = $('<ul/>').addClass(listHidden);
        for (i = 0, len = facetData.length; i < len; i = i + 1) {
          // Apply facet labels if specified
          if (config.useAlias.indexOf(constraint) !== -1) {
            for (key in arr) {
              if (arr.hasOwnProperty(key)) {
                facetData[i].value = facetData[i].value.replace(new RegExp(key, "g"), arr[key]);
              }
            }
          }

          values.append(buildFacetItem(facetData[i].name, facetData[i].value, facetData[i].count));
        }

        if (config.facets[constraint].otherURL !== undefined) {
          values.append($('<li/>')
            .addClass('other-value')
            .append($('<span/>')
              .text('Other'))
            .append($('<input/>')
              .attr('type', 'text')
              .addClass('other')));
          values.append($('<ul/>').addClass('suggestions'));
        }

        html = $('<div/>')
          .attr('id', 'facet-list-' + constraint)
          .addClass('facet-list' + listDisplay)
          .append($('<a/>')
            .attr('href', '#')
            .attr('id', 'facet-title-' + constraint)
            .addClass('tipdown' + listTipdown)
            .attr('title', 'tip down')
            .append($('<div/>')
              .addClass('facet-title-label')
              .attr('title', label)
              .html(truncateStr(label, 32))))
          .append(values);
      }

    }

    return html;
  };

};
