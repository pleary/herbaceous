var collage_randomization_array = [];
var collage_randomization_index = 0;
var slideshow_intervals = [];
var number_of_rows = 4;
var number_of_columns = 6;
var total_number_of_cells = number_of_rows * number_of_columns;

var socket = io.connect(window.location.hostname);
socket.on('add_to_collage', function(taxon_data) {
    append_image(taxon_data, true);
});
socket.on('update_user_count', function(count) {
    update_user_count(count);
});

$(function(){
    $('#search_term').select();
    $('#form_div form').submit(function() {
        var search_term = $('#search_term').val();
        $('#search_term').select();
        alert_user("Searching...");
        lookup_search(search_term);
        return false;
    });
    create_randomization_array();
    populate_initial_collage();
});

function create_randomization_array() {
    for(var i=0 ; i<total_number_of_cells ; i++) {
        var next_random = Math.floor(Math.random()*total_number_of_cells);
        while(collage_randomization_array.indexOf(next_random) > -1) {
            next_random = Math.floor(Math.random()*total_number_of_cells);
        }
        collage_randomization_array.push(next_random);
    }
    console.log(collage_randomization_array);
}
function get_next_random_index() {
    collage_randomization_index++;
    return collage_randomization_array[collage_randomization_index % collage_randomization_array.length];
}
function get_next_random_div() {
    var random_index = get_next_random_index();
    var row = Math.floor(random_index / number_of_columns);
    var column = random_index % number_of_columns;
    console.log("#"+ row +"-"+ column);
    return $("#"+ row +"-"+ column);
}

function populate_initial_collage() {
    for(var i=0 ; i<number_of_rows ; i++) {
        for(var j=0 ; j<number_of_columns ; j++) {
            var div_tag = "<div id='"+ i +"-"+ j +"'";
            var classes = [ 'cell' ];
            if(i == 0) classes.push('top');
            if(i == (number_of_rows-1)) classes.push('bottom');
            if(j == 0) classes.push('left');
            if(j == (number_of_columns-1)) classes.push('right');
            div_tag += "class='"+ classes.join(' ') +"'";
            div_tag += "></div>";
            $("#collage").append(div_tag);
        }
    }
    $.ajax({
        url: 'http://eol.org/api/collections/10986.json?per_page='+ total_number_of_cells +'&cache_ttl=604800&callback=?',
        dataType: 'jsonp',
        jsonpCallback: 'populate_initial_collage_callback',
        cache: true
    });
}

function populate_initial_collage_callback(json) {
    for(var i=0 ; i<json.collection_items.length ; i++) {
        var item = json.collection_items[i];
        append_images_from_concept(item.object_id);
    }
}

function lookup_search(search_term) {
    var taxonomic_filter = '';
    components = search_term.split(':');
    if(components.length == 2) {
        taxonomic_filter = components[0];
        search_term = components[1];
    }
    $.ajax({
        url: 'http://eol.org/api/search/1.0.json?cache_ttl=604800&callback=?&filter_by_string='+ taxonomic_filter +'&q=' + search_term,
        dataType: 'jsonp',
        jsonpCallback: 'lookup_search_callback',
        cache: true
    });
}

function lookup_search_callback(json) {
    if(json.results[0] === undefined) alert_user("No matches");
    else {
        var taxon_concept_id = json.results[0].id;
        alert_user("Getting images...");
        append_images_from_concept(taxon_concept_id);
    }
}

function append_images_from_concept(taxon_concept_id) {
    $.ajaxQueue({
        url: 'http://eol.org/api/pages.json?cache_ttl=603800&images=10&text=0&videos=0&details=1&callback=?&id=' + taxon_concept_id,
        dataType: 'jsonp',
        jsonpCallback: 'append_images_callback',
        cache: true,
        error: function (xhr, ajaxOptions, thrownError) {
            console.log(xhr.status);
            console.log(thrownError);
        }
    });
}

function append_images_callback(json) {
    var search_term = $('#search_term').val();
    if(json.dataObjects[0] === undefined) {
        alert_user("There are no images of \""+ search_term +"\"");
    } else {
        var taxon_data = { scientific_name: json.scientificName, images: [], id: json.identifier };
        for (var i=0 ; i<json.dataObjects.length; i++) {
            var image = json.dataObjects[i]
            var image_url = image.eolMediaURL.replace("_orig", "_130_130");
            taxon_data.images.push({ url: image_url, id: image.dataObjectVersionID });
        }
        append_image(taxon_data);
    }
}

function append_image(taxon_data, remote_call) {
    var action_type = 'automatic';
    if(remote_call) action_type = 'remote';
    else if($('#message_div').html() != "") action_type = 'search';
    if(action_type == 'search') socket.emit('add_to_collage', taxon_data);
    console.log(action_type);
    reset_user_message();
    div_html = "<div class='slideshow'>"
    taxon_data.images = taxon_data.images.sort(function() {return 0.5 - Math.random()});
    for (var i=0 ; i<taxon_data.images.length; i++) {
        var image = taxon_data.images[i];
        div_html += "<img src='"+ image.url +"' data-page_id='"+ taxon_data.id +"' data-object_id='"+
            escape(image.caption) +"' alt='' style='display:none;'/>";
    }
    div_html += "</div>";
    // find the next random image cell to use and update its images
    var random_div = get_next_random_div();
    random_div.html(div_html);
    // start the slideshow for the new images



    var slideshow = random_div.find(".slideshow");
    slideshow.find("img:first").show();
    if(action_type == 'search') slideshow.effect("bounce", { times:3, distance: 100 }, 2000);
    else if(action_type == 'remote') slideshow.effect("shake", { times:3, distance: 10 }, 2000);
    if(slideshow.find("img").length > 1) {
        slideshow.find("img:not(:first)").hide();
        start_slideshow(slideshow);
        slideshow.click(function() {
            slideshow.find("img:first").show();
            $(this).find("img:not(:first)").hide();
            $(this).find("img:first")
                .fadeOut(100)
                .next()
                .fadeIn(100)
                .end()
                .appendTo($(this));
            start_slideshow($(this));
        });
    }
}

function start_slideshow(slideshow_div) {
    console.log("start_slideshow");
    console.log(slideshow_div);
    console.log(slideshow_div.closest('.cell'));
    console.log(slideshow_div.closest('.cell').attr('id'));
    console.log(slideshow_intervals[slideshow_div.closest('.cell').attr('id')]);
    clearInterval(slideshow_intervals[slideshow_div.closest('.cell').attr('id')]);
    slideshow_intervals[slideshow_div.closest('.cell').attr('id')] = null;
    slideshow_intervals[slideshow_div.closest('.cell').attr('id')] = setInterval(function() {
        slideshow_div.find("img:first")
            .fadeOut(500)
            .next()
            .fadeIn(500)
            .end()
            .appendTo(slideshow_div);
    },  (4000 + Math.random()*4000));
}
function reset_user_message() {
    $('#message_div').html("");
}
function alert_user(message) {
    $('#message_div').html(message);
}
function update_user_count(count) {
    $('#user_count').html(count +" people online");
}
function pluralize(string) {
    var last_character = string.charAt(string.length-1);
    if(last_character.toLowerCase() != 's') {
        if (last_character == last_character.toUpperCase()) string += "S"
        else string += "s";
    }
    return string;
}
function create_indroductory_text(taxon_data, remote_call) {
    var intro = "Here";
    if(remote_call == true) intro = "Someone else found";
    if(taxon_data.images.length > 1) {
        if(remote_call == false) intro += " are";
        intro += " some"
    } else {
        if(remote_call == false) intro += "'s";
        if(['a', 'e', 'i', 'o', 'u'].indexOf(taxon_data.search_term.substring(0, 1).toLowerCase()) != -1) intro += " an"
        else intro += " a";
    }
    return intro;
}
