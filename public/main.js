var socket = io.connect(window.location.hostname);
socket.on('set_image', function(taxon_data) {
    set_image(taxon_data, true);
});
socket.on('update_user_count', function(count) {
    update_user_count(count);
});

$(function(){
    $('#header h2').html(window.location.hostname);
    $('#search_term').select();
    $('#form_div form').submit(function() {
        var search_term = $('#search_term').val();
        $('#search_term').select();
        alert_user("Searching...");
        lookup_search(search_term);
        return false;
    });
});

function lookup_search(search_term) {
    var taxonomic_filter = '';
    components = search_term.split(':');
    console.log(components);
    if(components.length == 2) {
        taxonomic_filter = components[0];
        search_term = components[1];
    }
    $.ajax({
        url: 'http://eol.org/api/search/1.0.json?cache_ttl=604800&callback=?&filter_by_string='+ taxonomic_filter +'&q=' + search_term,
        dataType: 'jsonp',
        jsonpCallback: 'lookup_search_callback',
        cache: true}
    );
}

function lookup_search_callback(json) {
    if(json.results[0] === undefined) alert_user("No matches");
    else {
        var taxon_concept_id = json.results[0].id;
        alert_user("Getting images...");
        $.ajax({
            url: 'http://eol.org/api/pages.json?cache_ttl=604800&images=10&text=0&videos=0&details=1&callback=?&id=' + taxon_concept_id,
            dataType: 'jsonp',
            jsonpCallback: 'replace_image_callback',
            cache: true }
        );
    }
}

function replace_image_callback(json) {
    var search_term = $('#search_term').val();
    if(json.dataObjects[0] === undefined) {
        alert_user("There are no images of \""+ search_term +"\"");
    } else {
        var taxon_data = { scientific_name: json.scientificName, search_term: search_term, images: [], id: json.identifier };
        for (var i=0 ; i<json.dataObjects.length; i++) {
            var image = json.dataObjects[i]
            var image_url = image.eolMediaURL.replace("_orig", "_580_360");
            var caption = image.agents[0].full_name;
            if(matches = image.license.match(/by(-nc)?(-sa)?/)) {
                caption = "<img src=\"http://eol.org/assets/licenses/cc_"+ matches[0].replace(/-/g, "_") +"_small.png\"/> " + caption
            }
            caption = "<a href='http://eol.org/data_objects/"+ image.dataObjectVersionID +"' target='_blank'>View this image in EOL</a><br>" + caption;
            taxon_data.images.push({ url: image_url, title: image.title, caption: caption, id: image.dataObjectVersionID });
        }
        reset_user_message();
        socket.emit('lets_all_look_at', taxon_data);
        set_image(taxon_data, false);
    }
}

function set_image(taxon_data, remote_call) {
    if($("#image_div div.stream_item").length == 0) $("#initial_message").hide();
    if($('#image_div div.stream_item').length > 14) $("#image_div div.stream_item:last").remove();
    var intro = create_indroductory_text(taxon_data, remote_call);
    var taxon_html = "\
        <div class='stream_item'><div class='image_caption'>"+ intro +"\
                <span class='search_term'>"+ pluralize(taxon_data.search_term) + "</span>\
                (<a href='http://eol.org/pages/"+ taxon_data.id +"/overview/' target='_blank'><i>"+ taxon_data.scientific_name +"</i></a>)\
            </div><div class='slideshow'>";
    for (var i=0 ; i<taxon_data.images.length; i++) {
        var image = taxon_data.images[i];
        taxon_html += "<img src='"+ image.url +"' data-title='"+ escape(image.title) +"' data-caption='"+ escape(image.caption) +"'/>";
    }
    taxon_html += "</div><div class='slideshow_caption'></div></div>";
    $("#image_div").prepend(taxon_html);
    var slideshow = $("#image_div .stream_item:first .slideshow");
    slideshow.cycle({ next: slideshow, speed: 500, after: function(){
        $(this).closest('.stream_item').find('.slideshow_caption').html(unescape($(this).data('caption')));
    } });
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
