const DOC_CLUSTER_KEYS = {
  topic_cluster : 'topicCluster',
  c_f_cluster : 'citationFunctionCluster'
}
const LAYOUT = {
  radius : 5,
  bottom_menu_hight: 300,
  margins: {
    left : 35,
    right : 35,
    top : 35,
    bottom : 0}
}

let clusters;
let documents;
let colors;

let cluster_info;
let flex_term;
let svg;

let width;
let height;

let selected_years = [2000, 2001];
let selected_cluster_name = 'topic_cluster'

// Promise.all for combining two async requests
Promise.all([d3.json("./data/documents.json"), d3.json("./data/clusters.json")])
        .then(function(data) {
          [documents, clusters] = data;
          colors = init_color_scales(clusters);
          const select = document.getElementById("cluster_select");
          select.onchange = (e) => select_change(e);
          select.disabled = false;
          init_range();
          init_svg();
          render_cluster();
        });

function init_range () {

  var d = create_year_range(documents);
  // Range
  var sliderRange = d3
    .sliderBottom()
    .min(d3.min(d))
    .max(d3.max(d))
    .width(1000)
    .ticks(d.length)
    .step(1)
    .default(selected_years)
    .fill('#2196f3')
    .on('onchange', val => {
      change_years(val)
      d3.select('p#value-range').text(val.join('-'));
    });
 
    var gRange = d3
      .select('div#slider-range')
      .append('svg')
      .attr('width', 1200)
      .attr('height', 100)
      .append('g')
      .attr('transform', 'translate(30,30)');

    gRange.call(sliderRange);

    d3.select('p#value-range').text(
      sliderRange
        .value()
        .join('-')
      );
}

function create_year_range(documents){
  years = documents.reduce((years,doc)=>{
    years.push(doc.pubYear)
    return years;
  }, [])
  list = []
  for (var i = Math.min(...years); i <= Math.max(...years); i++) {
    list.push(i);
  }
  return (list)
}

function change_years(value) {
  selected_years = value;
  render_cluster();
}

function init_color_scales(clusters) {
  topic_cluster_colors = d3.quantize(d3.interpolateHcl("#f4e153", "#362142"), clusters.topic_cluster.length)
  citation_function_colors = d3.quantize(d3.interpolateHcl("#d66000", "#a9a9b4"), clusters.c_f_cluster.length)
  topic_cluster_colors_map = clusters.topic_cluster.reduce((acc,c,i) => { acc[c.cluster_id] = topic_cluster_colors[i];
                                                                          return acc}, {})
  citation_function_colors_map = clusters.c_f_cluster.reduce((acc,c,i) => { acc[c.cluster_id] = citation_function_colors[i];
                                                                          return acc}, {})
  return {
    topic_cluster: topic_cluster_colors_map,
    c_f_cluster: citation_function_colors_map
  }
}

function init_svg() {

  width =  window.screen.width - 30;
  height =  window.screen.height - LAYOUT.bottom_menu_hight;

  var div = d3.select("#viz")

  cluster_info = d3.select("#cluster_description")
  cluster_info
      .attr("id","cluster_description")
      .classed("cluster-info", true)
    
  cluster_id = d3.select('#ClusterID')
  year_range = d3.select('#ClusterYearRange')
  flex_term = d3.select('#kw')
  cited_docs = d3.select('#ClusterCitedDocs')
  cluster_pin = d3.select('#cluster_pin')
  cluster_cards_container = d3.select('#cluster_cards_container')

  svg = div.append("svg")
              .attr("id","content")
              .attr("width",width)
              .attr("height", height)
}

function create_centroid_grid (clusters) {
  return clusters.map((cluster)=> 
    [(cluster["x"] * (width - LAYOUT.margins.right)) + LAYOUT.margins.left,
     (cluster["y"] * (height - LAYOUT.margins.bottom)) + LAYOUT.margins.top]
  )
}

function select_change(event) {
  selected_cluster_name = event.target.value;
  render_cluster();
}

function render_cluster() {

  const selected_cluster = clusters[selected_cluster_name];
  const cluster_key = DOC_CLUSTER_KEYS[selected_cluster_name];
  
  // TO USE GRID INSTEAD OF CLUSTER CENTROIDS
  // var grid_n = topic_clusters.length
  // var size = 80
  // var grid_coords = create_grid(grid_n, 8, size)  

  let cluster_colors = selected_cluster_name == 'topic_cluster' ? 'c_f_cluster' : 'topic_cluster';
  let grid_coords = create_centroid_grid(selected_cluster)
  let layout_packed = create_circle_layout_data(LAYOUT.radius, documents, selected_cluster, cluster_key, grid_coords)         
  clusters_layout = applySimulation([...new Map(layout_packed).values()], 2)
  create_circle_layout(clusters_layout, colors[cluster_colors], DOC_CLUSTER_KEYS[cluster_colors])

}

// n, number of elements in the Array
// g_width of the grid
// size, scale to adjust the grid in pixels
function create_grid(n, g_width, size) {
  var height = Math.ceil(n / g_width)
  var coords = []
  for (let x = 0; x < g_width; x++) {
    for (let y = 0; y < height; y++) {
      if (coords.length == n) {
        break;
      }
      else {
        coords.push([x * size + (size/2), y * size + (size/2)])
      }
    }
  }
  return coords
}

function filt_time(year,documents){
    const filtered_documents = []
    for (i = 0; i < documents.length; i++) {
      if(documents[i].pubYear == year) {
        filtered_documents.push(documents[i])
      }
    }
    return filtered_documents
}

function create_card(d,i){
    const cluster = d.cluster;
    const cluster_summary = `
    Cluster ID : ${i}
    Top Cited Documents: ${cluster.top_cited_docs.join(', ')}\n
    Categories: ${cluster.categories.join(', ')}\n
    Flex Terms: ${cluster.top_flexTerms.join(', ')}\n
    Subjects: ${cluster.top_subjects.join(', ')}\n
    Years: ${cluster.years.join(', ')}\n
    `
    var cluster_card = new Object();
    cluster_card = {
      'Cluster ID' :i,
      'Key Words': cluster.top_flexTerms.join(', '),
      'Years' :cluster.years.join(', '),
      'Citations': cluster.top_cited_docs.join(', '),
    }
    console.log(cluster_card)

    container = d3.select('#cluster_cards_container')
        .classed('d-flex flex-row ',true)
        .append('div')
        .classed('card border-success mb-3 p-2',true)
        .attr('id','clusterid'+i)
        .attr('style','max-width:40rem;')
    
    header = container.append('div')
        .classed('card-header bg-transparent d-flex justify-content-between ',true)
    
    header.text('Cluster '+i)
        .append('button')
        .text('Delete')
        .on('click', function(){
            d3.select('#clusterid'+i).remove()
        })

    body = container.append('div')
        .classed('card-body',true)
    body.append('h6').classed('card-title',true).text('Key Words')
      body.append('p')
      .classed('card-text',true)
      .text(cluster_card['Key Words'])
        
    body.append('h6').classed('card-title',true).text('Top Citations')
      body.append('p')
      .classed('card-text',true)
      .text(cluster_card['Citations'])
  
    body.append('div')
        .classed('card-footer bg-transparent',true)
        .text(cluster_card['Years'])    
      
    
}

function delete_card(){
  console.log('delete')
}

function create_circle_layout_data(radius, documents, clusters, cluster_key, grid_coords){
  var grouped_docs = documents.reduce((m, d) => {
    var doc = { data: d, r: radius }
   
    if (m[d[cluster_key]]) {
      m[d[cluster_key]].push(doc)
    } else {
      m[d[cluster_key]] = [doc]
    } 
    return m;
  }, {})
  return clusters.reduce((map,cluster,i) => {
    var docs = grouped_docs[cluster['cluster_id']]
    const nodes = d3.packSiblings(docs)
    const { r } = d3.packEnclose(nodes) 
    const [x, y] = grid_coords[i]
    map.set(cluster['cluster_id'], { nodes, r, x, y, cluster })
    return map;
  }, new Map())
}

function applySimulation (nodes, padding) {
  const simulation = d3.forceSimulation(nodes)
    .force("cx", d3.forceX().x(d => width / 2).strength(0.07))
    .force("cy", d3.forceY().y(d => height / 2).strength(0.3))
    .force("x", d3.forceX().x(d => d.x).strength(0.3))
    .force("y", d3.forceY().y(d => d.y).strength(0.3))
    .force("charge", d3.forceManyBody().strength(-1))
    .force("collide", d3.forceCollide().radius(d => d.r + padding).strength(1))
    .stop()

  while (simulation.alpha() > 0.01) {
    simulation.tick(); 
  }

  return simulation.nodes();
}

function create_circle_layout(cluster_layout, cluster_colors, selected_cluster) {

  svg.selectAll("*").remove();

  const clusters_data = 
    svg
    .append("g")
    .classed("clusters", true).selectAll(".cluster")
    .data(cluster_layout)
    
  const clusters = clusters_data.enter()
    .append("g")
    .classed("cluster", true)
    .attr("transform", d => `translate(${d.x}, ${d.y})`);
          
  clusters
    .append("circle")
    .attr("r", d => d.r)
    .attr("fill", "#e2e2e2")
    .on('click', function (d,i) {
      create_card(d,i)
    })
    //  .on('mouseout', function () {
    //       cluster_info.text("")
    //       d3.select(this).transition()
    //            .duration('100')
    //            .attr('opacity', '1');})

  const docs_data = clusters
    .selectAll(".document")
    .data(d => d.nodes)
    
  const docs=  docs_data.enter()
    .append("circle")
    .classed("document", true)
    .attr("r", d => d.r)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("fill", d => cluster_colors[d.data[selected_cluster]])
    .attr('opacity', (d)=>{
      if (d.data.pubYear <= selected_years[1] && d.data.pubYear >= selected_years[0]){
        return 1.0
      } else {
        return 0.2
      }
    })
    //selected_years
  
    docs.append("title")
    .text(d => `${d.data.title}, ${d.data.pubYear}\nAuthors: ${d.data.authors.join('; ')}\nsubjects: ${d.data.subjects.join(', ')}\nflex terms: ${d.data.flexTerms.join(', ')}`)
  
  clusters_data.exit().remove();
  docs_data.exit().remove();
          
}
