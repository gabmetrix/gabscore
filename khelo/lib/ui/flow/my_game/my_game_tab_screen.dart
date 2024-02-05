import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:khelo/components/app_page.dart';
import 'package:khelo/domain/extensions/context_extensions.dart';
import 'package:khelo/ui/flow/matches/match_list_screen.dart';
import 'package:khelo/ui/flow/my_game/my_game_tab_view_model.dart';
import 'package:khelo/ui/flow/team/team_list_screen.dart';
import 'package:style/animations/on_tap_scale.dart';
import 'package:style/extensions/context_extensions.dart';
import 'package:style/text/app_text_style.dart';

class MyGameTabScreen extends ConsumerStatefulWidget {
  const MyGameTabScreen({super.key});

  @override
  ConsumerState createState() => _MyGameTabScreenState();
}

class _MyGameTabScreenState extends ConsumerState<MyGameTabScreen> {
  final List<Widget> _tabs = [
    const TeamListScreen(),
    const MatchListScreen(),
  ];

  late PageController _controller;

  late MyGameTabViewNotifier notifier;

  int get _selectedTab => _controller.hasClients
      ? _controller.page?.round() ?? 0
      : _controller.initialPage;

  @override
  void initState() {
    super.initState();
    notifier = ref.read(myGameTabViewStateProvider.notifier);
    _controller = PageController(
      initialPage: ref.read(myGameTabViewStateProvider).selectedTab,
    );
  }

  @override
  Widget build(BuildContext context) {
    notifier = ref.watch(myGameTabViewStateProvider.notifier);
    return AppPage(
      body: Builder(
        builder: (context) {
          return _content(context, ref);
        },
      ),
    );
  }

  Widget _content(BuildContext context, WidgetRef ref) {
    return SafeArea(
      child: Column(
        children: [
          _tabView(context),
          Expanded(
            child: PageView(
              controller: _controller,
              children: _tabs,
              onPageChanged: (index) {
                notifier.onTabChange(index);
                setState(() {});
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabView(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          _tabButton(
            context.l10n.my_game_teams_tab_title,
            _selectedTab == 0,
            onTap: () {
              _controller.jumpToPage(0);
            },
          ),
          const SizedBox(width: 8),
          _tabButton(
            context.l10n.my_game_matches_tab_title,
            _selectedTab == 1,
            onTap: () {
              _controller.jumpToPage(1);
            },
          ),
        ],
      ),
    );
  }

  Widget _tabButton(String title, bool selected, {VoidCallback? onTap}) {
    return OnTapScale(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? context.colorScheme.primary
              : context.colorScheme.containerLow,
          borderRadius: BorderRadius.circular(56),
        ),
        child: Text(
          title,
          style: AppTextStyle.body2.copyWith(
            color: selected
                ? context.colorScheme.onPrimary
                : context.colorScheme.textSecondary,
          ),
        ),
      ),
    );
  }
}
