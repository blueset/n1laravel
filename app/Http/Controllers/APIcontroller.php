<?php

namespace App\Http\Controllers;

use App\Helpers\SlugHelper;
use Illuminate\Http\Request;

use App\Http\Requests;

class APIController extends Controller
{
    public function getSlug(Request $request) {
        if (! $request->has('msg')) {
            return response()->json(['error' => 'Field "msg" is required.'], 400);
        }
        if ($request->has('module')) {
            if ($request->has('id')) {
                return SlugHelper::getNextAvailableSlug($request->msg, $request->module, $request->id);
            }
            return SlugHelper::getNextAvailableSlug($request->msg, $request->module);
        }
        return SlugHelper::getSlug($request->msg);
    }

    public function getLastUpdate() {
        $result = \App\Post::select(["title", "category", "slug", "published_on"])->take(3)->get()->toArray();
        foreach ($result as &$r) {
            $r['type'] = 'post';
            $r['category'] = \App\Category::findOrFail(intval($r['category']))->slug;
        }
        return response()->json(array_slice($result, 0, 3));
    }

    public function getAllCategories() {
        $result = \App\Category::select(["slug", "name"])->get()->toArray();
        return response()->json($result);
    }

    public function getCategory($slug) {
        $cat = \App\Category::where('slug', $slug)->select(["id", "slug", "name", "template"])->firstOrFail()->toArray();
        $cat['posts'] = \App\Post::select(['id'])->where("category", $cat['id'])->paginate(20)->toArray();
        return response()->json($cat);
    }

    public function postPosts(Request $request){
        $column = "id";
        if (isset($request->slug)){
            $request->posts = [$request->slug];
            $column = 'slug';
        }
        $result = [];
        $with = [];
        $select = isset($request->select)? $request->select :
                  ['id', 'slug', 'title', 'published_on', 'desc', 'image',
                   'category', 'tags', 'links', 'meta'];
        if (count($request->posts) == 1){
            $select = ['id', 'slug', 'title', 'body', 'published_on', 'desc', 'image',
                'category', 'tags', 'links', 'meta'];
        }
        if (in_array('category', $select)){
            $with['cate'] = function($query) {$query->select(['id', 'name', 'slug', 'template']);};
        }
        if (in_array('tags', $select)){
            $select = array_diff($select, ['tags']);
            $with['tags'] = function($query) {$query->select(['name', 'slug']);};
        }
        if (in_array('links', $select)){
            $select = array_diff($select, ['links']);
            $with['links'] = function($query) {$query->select(['post', 'name', 'url', 'css_class', 'order']);};
        }
        if (in_array('meta', $select)){
            $select = array_diff($select, ['meta']);
            $with['meta'] = function($query) {$query->select(['post', 'key', 'value']);};
        }
        foreach ($request->posts as $id) {
            $q = \App\Post::with($with)
                ->select($select)
                ->where($column, $id)
                ->firstOrFail();
            $item = $q->toArray();
            if (array_key_exists('image', $item)) {
                $item['imageMeta'] = ["html" => \App\Image::where('slug', $item['image'])->exists() ? \App\Image::where('slug', $item['image'])->first()->pictureElement()->title($item['title'])->render() : ""];
                if (\App\Image::where('slug', $item['image'])->exists()) {
                    $dimension = getimagesize(\Storage::getDriver()->getAdapter()->applyPathPrefix(\App\Image::where('slug', $item['image'])->first()->path));
                    $item['imageMeta']['width'] = $dimension[0];
                    $item['imageMeta']['height'] = $dimension[1];
                } else {
                    $item['imageMeta'] = [];
                }
            }
            if (array_key_exists('desc', $item)) {
                $item['desc'] = \Markdown::text($item['desc']);
            }
            if (array_key_exists('body', $item)) {
                $item['body'] = \Markdown::text($item['body']);
            }
            if (array_key_exists('meta', $item)) {
                $item['meta'] = array_combine(array_column($item['meta'], 'key'), array_column($item['meta'], 'value'));
            }
            array_push($result, $item);
        }
        return response()->json($result);
    }

}
